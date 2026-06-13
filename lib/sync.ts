/**
 * Logica de sincronizacion con football-data.org (plan gratuito), compartida
 * por el script de CLI (scripts/syncResults.ts) y la ruta serverless
 * (app/api/sync/route.ts).
 *
 * Mapeo: cada partido de la API se empareja con nuestro fixture por el par de
 * codigos FIFA (tla) + fecha UTC del dia. Los que no matchean se loguean y se
 * omiten (se pueden cargar a mano con `npm run set-result`).
 *
 *   - API FINISHED        -> result + status "finished" + evaluacion de pronosticos
 *   - API IN_PLAY / PAUSED -> status "live" + liveScore (parcial que se refresca
 *     en cada corrida; NO asigna puntos). El cierre/revelacion de pronosticos
 *     pasa a la hora exacta del kickoff (cliente + reglas), no por esto.
 *
 * Es idempotente: omite partidos ya "finished" y pronosticos ya evaluados.
 */
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { computePoints } from './scoring';

const API_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | ...
  homeTeam: { tla?: string | null; name?: string | null };
  awayTeam: { tla?: string | null; name?: string | null };
  score: { fullTime: { home: number | null; away: number | null } };
}

export interface SyncSummary {
  finished: number;
  live: number;
  unmatched: number;
  logs: string[];
}

/** Clave de emparejamiento: codigos de ambos equipos + dia UTC. */
function matchKey(homeCode: string, awayCode: string, utcDate: Date): string {
  return `${homeCode}_${awayCode}_${utcDate.toISOString().slice(0, 10)}`;
}

async function fetchApiMatches(apiKey: string): Promise<ApiMatch[]> {
  const res = await fetch(API_URL, { headers: { 'X-Auth-Token': apiKey } });
  if (!res.ok) {
    throw new Error(`football-data.org ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { matches?: ApiMatch[] };
  return data.matches ?? [];
}

async function finishMatch(
  db: Firestore,
  matchId: string,
  homeGoals: number,
  awayGoals: number
): Promise<{ evaluated: number; skipped: number }> {
  const predsSnap = await db
    .collection('predictions')
    .where('matchId', '==', matchId)
    .get();

  const batch = db.batch();
  batch.update(db.collection('matches').doc(matchId), {
    result: { homeGoals, awayGoals },
    status: 'finished',
    liveScore: null, // ya no hay parcial: el resultado final es `result`
  });

  let evaluated = 0;
  let skipped = 0;
  for (const doc of predsSnap.docs) {
    const p = doc.data();
    if (p.evaluated) {
      skipped++;
      continue;
    }
    const points = computePoints(
      p.predictedHomeGoals,
      p.predictedAwayGoals,
      homeGoals,
      awayGoals
    );
    batch.update(doc.ref, { pointsEarned: points, evaluated: true });
    batch.update(db.collection('users').doc(p.userId), {
      totalPoints: FieldValue.increment(points),
      ...(points === 5 && { exactResults: FieldValue.increment(1) }),
      ...(points === 3 && { correctResults: FieldValue.increment(1) }),
    });
    evaluated++;
  }

  await batch.commit();
  return { evaluated, skipped };
}

/**
 * Hace UNA request a la API y aplica los cambios en Firestore. Devuelve el
 * resumen y la lista de lineas de log (el llamador decide como mostrarlas).
 */
export async function runSync(db: Firestore, apiKey: string): Promise<SyncSummary> {
  const logs: string[] = [];

  const [apiMatches, oursSnap] = await Promise.all([
    fetchApiMatches(apiKey),
    db.collection('matches').get(),
  ]);

  // Indice de nuestros partidos no terminados, por clave de emparejamiento.
  const pending = new Map<string, { id: string; status: string }>();
  for (const doc of oursSnap.docs) {
    const m = doc.data();
    if (m.status === 'finished') continue;
    pending.set(
      matchKey(m.homeTeam.code, m.awayTeam.code, m.scheduledAt.toDate()),
      { id: doc.id, status: m.status }
    );
  }

  let finished = 0;
  let live = 0;
  let unmatched = 0;

  for (const am of apiMatches) {
    const homeTla = am.homeTeam.tla;
    const awayTla = am.awayTeam.tla;
    if (!homeTla || !awayTla) continue; // cruces aun sin equipos definidos

    const relevant =
      am.status === 'FINISHED' ||
      am.status === 'IN_PLAY' ||
      am.status === 'PAUSED';
    if (!relevant) continue;

    const ours = pending.get(matchKey(homeTla, awayTla, new Date(am.utcDate)));
    if (!ours) {
      // Ya estaba finished, o no matchea (codigo/fecha distintos): se omite.
      unmatched++;
      logs.push(
        `Sin match local pendiente para ${homeTla} vs ${awayTla} (${am.utcDate}, ${am.status})`
      );
      continue;
    }

    if (am.status === 'FINISHED') {
      const home = am.score.fullTime.home;
      const away = am.score.fullTime.away;
      if (home == null || away == null) continue;
      const { evaluated, skipped } = await finishMatch(db, ours.id, home, away);
      finished++;
      logs.push(
        `OK: ${homeTla} ${home}-${away} ${awayTla} (${ours.id}) -> finished | ` +
          `evaluados: ${evaluated}${skipped ? ` | omitidos: ${skipped}` : ''}`
      );
    } else {
      // IN_PLAY / PAUSED: marca "live" y refresca el resultado parcial en cada
      // corrida (no asigna puntos: eso solo pasa con FINISHED). El marcador en
      // juego viene en score.fullTime; null al inicio -> 0.
      const home = am.score.fullTime.home ?? 0;
      const away = am.score.fullTime.away ?? 0;
      await db.collection('matches').doc(ours.id).update({
        status: 'live',
        liveScore: { homeGoals: home, awayGoals: away },
      });
      live++;
      logs.push(`EN VIVO: ${homeTla} ${home}-${away} ${awayTla} (${ours.id})`);
    }
  }

  logs.push(
    `Listo. Finalizados: ${finished} | pasados a live: ${live}` +
      (unmatched ? ` | sin emparejar: ${unmatched}` : '')
  );

  return { finished, live, unmatched, logs };
}
