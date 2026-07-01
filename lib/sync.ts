/**
 * Logica de sincronizacion con football-data.org (plan gratuito), compartida
 * por el script de CLI (scripts/syncResults.ts) y la ruta serverless
 * (app/api/sync/route.ts).
 *
 * Mapeo: cada partido de la API se empareja con nuestro fixture por el par de
 * codigos FIFA (tla) + fecha UTC del dia. Los que no matchean se loguean y se
 * omiten (se pueden cargar a mano con `npm run set-result`).
 *
 *   - API FINISHED -> result + status "finished" + evaluacion de pronosticos
 *
 * NO seguimos el partido en vivo: el cartel "EN VIVO" lo calcula el cliente por
 * la hora de kickoff (sin escrituras), asi que el sync no marca "live" ni
 * escribe parciales. Eso permite correrlo poco seguido (solo para finalizar) y
 * baja muchisimo el consumo de Firestore. Lee solo los partidos no finalizados.
 *
 * Es idempotente: omite partidos ya "finished" y pronosticos ya evaluados.
 */
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { computePoints } from './scoring';
import { resolveTeam } from './fixtureTeams';
import type { MatchResult, ResultDetail } from './types';

const API_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

interface ApiScoreLine {
  home: number | null;
  away: number | null;
}

// En eliminacion `fullTime` es el TOTAL: fullTime = regularTime + extraTime +
// penales (ej: un 1-1 definido 4-2 por penales llega como 5-3). `regularTime`
// trae el marcador a los 90' pero la API a veces lo deja en null (ej: cruces
// definidos en la prorroga: viene null aunque haya extraTime). Por eso NUNCA
// alcanza con preferir `regularTime`: derivamos los 90' restando prorroga y
// penales. Ver scoreAt90().
interface ApiScore {
  winner?: string | null; // HOME_TEAM | AWAY_TEAM | DRAW
  duration?: string | null; // REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT
  fullTime: ApiScoreLine;
  regularTime?: ApiScoreLine | null;
  extraTime?: ApiScoreLine | null;
  penalties?: ApiScoreLine | null;
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string; // SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | ...
  homeTeam: { tla?: string | null; name?: string | null };
  awayTeam: { tla?: string | null; name?: string | null };
  score: ApiScore;
}

/**
 * Marcador a los 90 minutos (tiempo reglamentario). Por decision del prode, la
 * eliminacion directa se puntua por los 90' e ignora prorroga y penales.
 * Usamos `regularTime` cuando viene, pero como la API a veces lo deja en null
 * (partidos definidos en la prorroga), lo derivamos del total:
 *   90' = fullTime - prorroga - penales   (componente a componente)
 * En partidos normales no hay extraTime/penalties, asi que queda = fullTime.
 */
export function scoreAt90(score: ApiScore): ApiScoreLine {
  const reg = score.regularTime;
  if (reg && reg.home != null && reg.away != null) return reg;
  const ft = score.fullTime;
  if (ft.home == null || ft.away == null) return ft;
  const et = score.extraTime;
  const pk = score.penalties;
  return {
    home: ft.home - (et?.home ?? 0) - (pk?.home ?? 0),
    away: ft.away - (et?.away ?? 0) - (pk?.away ?? 0),
  };
}

/**
 * Detalle a mostrar cuando un cruce NO se definio en los 90' (prorroga o
 * penales). Devuelve null en partidos normales. NO afecta el puntaje: es solo
 * para que la UI muestre como termino realmente y quien avanzo.
 */
export function knockoutDetail(score: ApiScore): ResultDetail | null {
  const dur = score.duration;
  if (dur !== 'EXTRA_TIME' && dur !== 'PENALTY_SHOOTOUT') return null;

  const ft = score.fullTime;
  const pk = score.penalties;
  const pkHome = pk?.home ?? 0;
  const pkAway = pk?.away ?? 0;
  // `fullTime` incluye penales, asi que el marcador tras la prorroga (antes de
  // la tanda) = fullTime - penales.
  const fullTime: MatchResult = {
    homeGoals: (ft.home ?? 0) - pkHome,
    awayGoals: (ft.away ?? 0) - pkAway,
  };
  const penalties: MatchResult | null =
    dur === 'PENALTY_SHOOTOUT' ? { homeGoals: pkHome, awayGoals: pkAway } : null;

  let winner: 'home' | 'away';
  if (score.winner === 'HOME_TEAM') winner = 'home';
  else if (score.winner === 'AWAY_TEAM') winner = 'away';
  else if (dur === 'PENALTY_SHOOTOUT') winner = pkHome >= pkAway ? 'home' : 'away';
  else winner = fullTime.homeGoals >= fullTime.awayGoals ? 'home' : 'away';

  return { duration: dur, fullTime, penalties, winner };
}

export interface SyncSummary {
  finished: number;
  filled: number;
  unmatched: number;
  logs: string[];
}

/** Clave de emparejamiento: codigos de ambos equipos + dia UTC. */
function matchKey(homeCode: string, awayCode: string, utcDate: Date): string {
  return `${homeCode}_${awayCode}_${utcDate.toISOString().slice(0, 10)}`;
}

async function fetchApiMatches(apiKey: string): Promise<ApiMatch[]> {
  // `cache: 'no-store'` es CRITICO: sin esto, en el route handler de Vercel el
  // Data Cache de Next.js cachea esta respuesta y el cron termina evaluando un
  // snapshot viejo de la API (el partido sigue "upcoming" / el parcial clavado)
  // aunque corra cada 5 min y devuelva 200. El CLI local no pasa por ese cache,
  // por eso alli siempre se ven datos frescos. Forzamos siempre datos en vivo.
  const res = await fetch(API_URL, {
    headers: { 'X-Auth-Token': apiKey },
    cache: 'no-store',
  });
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
  awayGoals: number,
  detail: ResultDetail | null
): Promise<{ evaluated: number; skipped: number }> {
  const predsSnap = await db
    .collection('predictions')
    .where('matchId', '==', matchId)
    .get();

  const batch = db.batch();
  batch.update(db.collection('matches').doc(matchId), {
    // OJO: `homeGoals`/`awayGoals` son los 90' (ver scoreAt90) — el puntaje se
    // calcula con esto. El detalle de prorroga/penales va aparte en resultDetail.
    result: { homeGoals, awayGoals },
    status: 'finished',
    resultDetail: detail, // null en partidos definidos en los 90'
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
    // Solo leemos los partidos aun no finalizados: el cron solo finaliza, asi
    // que ya no necesitamos releer los terminados (menos lecturas en Firestore).
    db.collection('matches').where('status', '!=', 'finished').get(),
  ]);

  // Indice de nuestros partidos no terminados, por clave de emparejamiento.
  const pending = new Map<string, { id: string }>();
  for (const doc of oursSnap.docs) {
    const m = doc.data();
    pending.set(
      matchKey(m.homeTeam.code, m.awayTeam.code, m.scheduledAt.toDate()),
      { id: doc.id }
    );
  }

  // Indice de los partidos de la API por horario UTC exacto, para completar los
  // cruces de eliminacion (que en nuestro fixture estan con equipos "TBD" y por
  // eso no se pueden emparejar por codigo). Los kickoffs de eliminacion estan
  // escalonados, asi que el utcDate es una clave unica.
  const apiByTime = new Map<string, ApiMatch>();
  for (const am of apiMatches) {
    apiByTime.set(new Date(am.utcDate).toISOString(), am);
  }

  // Pase de completado: a cada cruce todavia en "TBD" le ponemos los equipos
  // reales una vez que la API ya los definio, tomando nombre/bandera de nuestro
  // catalogo (espanol + emoji). Sin lecturas extra: usa lo ya traido. Una vez
  // con codigos reales, el sync normal lo finaliza por matchKey en proximas
  // corridas.
  let filled = 0;
  const fillBatch = db.batch();
  let fillOps = 0;
  for (const doc of oursSnap.docs) {
    const m = doc.data();
    const homeTbd = !m.homeTeam?.code || m.homeTeam.code === 'TBD';
    const awayTbd = !m.awayTeam?.code || m.awayTeam.code === 'TBD';
    if (!homeTbd && !awayTbd) continue; // ya definido

    const am = apiByTime.get(m.scheduledAt.toDate().toISOString());
    if (!am) continue;
    const ht = am.homeTeam.tla;
    const at = am.awayTeam.tla;
    if (!ht || !at) continue; // la API tampoco lo definio aun

    const home = resolveTeam(ht, am.homeTeam.name);
    const away = resolveTeam(at, am.awayTeam.name);
    fillBatch.update(doc.ref, {
      homeTeam: { name: home.name, code: home.code, flag: home.flag },
      awayTeam: { name: away.name, code: away.code, flag: away.flag },
    });
    fillOps++;
    filled++;
    logs.push(`Cruce definido: ${home.code} vs ${away.code} (${doc.id})`);
  }
  if (fillOps) await fillBatch.commit();

  let finished = 0;
  let unmatched = 0;

  for (const am of apiMatches) {
    const homeTla = am.homeTeam.tla;
    const awayTla = am.awayTeam.tla;
    if (!homeTla || !awayTla) continue; // cruces aun sin equipos definidos

    // Solo nos interesan los finalizados: el "en vivo" es del lado del cliente.
    if (am.status !== 'FINISHED') continue;

    const ours = pending.get(matchKey(homeTla, awayTla, new Date(am.utcDate)));
    if (!ours) {
      // Ya estaba finished, o no matchea (codigo/fecha distintos): se omite.
      unmatched++;
      logs.push(
        `Sin match local pendiente para ${homeTla} vs ${awayTla} (${am.utcDate}, ${am.status})`
      );
      continue;
    }

    const score90 = scoreAt90(am.score);
    const home = score90.home;
    const away = score90.away;
    if (home == null || away == null) continue;
    const detail = knockoutDetail(am.score);
    const { evaluated, skipped } = await finishMatch(db, ours.id, home, away, detail);
    finished++;
    logs.push(
      `OK: ${homeTla} ${home}-${away} ${awayTla} (${ours.id}) -> finished | ` +
        `evaluados: ${evaluated}${skipped ? ` | omitidos: ${skipped}` : ''}`
    );
  }

  logs.push(
    `Listo. Finalizados: ${finished}` +
      (filled ? ` | cruces definidos: ${filled}` : '') +
      (unmatched ? ` | sin emparejar: ${unmatched}` : '')
  );

  return { finished, filled, unmatched, logs };
}
