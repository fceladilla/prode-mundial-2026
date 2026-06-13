/**
 * Sincroniza resultados desde football-data.org (plan gratuito) y evalua los
 * pronosticos con la misma logica que scripts/setResult.ts. Pensado para
 * correr periodicamente desde GitHub Actions (.github/workflows/sync-results.yml).
 *
 * Mapeo: cada partido de la API se empareja con nuestro fixture por el par de
 * codigos FIFA (tla) + fecha UTC del dia. Los que no matchean se loguean y se
 * omiten (se pueden cargar a mano con `npm run set-result`).
 *
 *   - API FINISHED  -> result + status "finished" + evaluacion de pronosticos
 *   - API IN_PLAY / PAUSED -> status "live" + liveScore (resultado parcial que
 *     se refresca en cada corrida; NO asigna puntos). El cierre/revelacion de
 *     pronosticos ya no depende de esto: pasa a la hora exacta del kickoff.
 *
 * Credenciales:
 *   FOOTBALL_DATA_API_KEY     token de football-data.org (obligatorio)
 *   FIREBASE_SERVICE_ACCOUNT  JSON de la service account en una linea (CI);
 *                             local cae a scripts/serviceAccountKey.json
 *
 * Es idempotente: omite partidos ya "finished" y pronosticos ya evaluados.
 *
 * Uso local:  npm run sync-results
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { computePoints } from '../lib/scoring';

const API_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | ...
  homeTeam: { tla?: string | null; name?: string | null };
  awayTeam: { tla?: string | null; name?: string | null };
  score: { fullTime: { home: number | null; away: number | null } };
}

function loadServiceAccount() {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (fromEnv) return JSON.parse(fromEnv);
  const file = resolve(process.cwd(), 'scripts/serviceAccountKey.json');
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  throw new Error(
    'Falta FIREBASE_SERVICE_ACCOUNT (env) o scripts/serviceAccountKey.json'
  );
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
  db: FirebaseFirestore.Firestore,
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

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error('Falta FOOTBALL_DATA_API_KEY (env).');

  initializeApp({ credential: cert(loadServiceAccount()) });
  const db = getFirestore();

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
      console.warn(
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
      console.log(
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
      console.log(`EN VIVO: ${homeTla} ${home}-${away} ${awayTla} (${ours.id})`);
    }
  }

  console.log(
    `Listo. Finalizados: ${finished} | pasados a live: ${live}` +
      (unmatched ? ` | sin emparejar: ${unmatched}` : '')
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
