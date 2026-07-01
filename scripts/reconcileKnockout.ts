/**
 * Reconcilia los cruces de ELIMINACION ya finalizados contra la API, aplicando
 * la regla de los 90' (ver lib/sync.ts scoreAt90 / knockoutDetail).
 *
 * Sirve para arreglar partidos que quedaron mal cargados antes del fix del
 * `scoreAt90` (cuando la API devolvia `regularTime: null` en un cruce definido
 * en la prorroga, el sync viejo tomaba `fullTime` CON prorroga). Para cada
 * cruce finalizado:
 *   - recalcula los 90' y el detalle (prorroga/penales/ganador) desde la API
 *   - si los 90' cambian, REVIERTE los puntos viejos de cada usuario y vuelve a
 *     evaluar con el marcador correcto (como correct-result)
 *   - escribe `result` (90') + `resultDetail` (para mostrar como termino)
 *
 * Es idempotente: si nada cambia, no toca puntajes.
 *
 * Uso:  FOOTBALL_DATA_API_KEY=xxx npm run reconcile-knockout
 *       (agregar `-- --apply` para escribir; sin eso solo muestra que haria)
 */
import { getAdminDb } from '../lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { computePoints } from '../lib/scoring';
import { scoreAt90, knockoutDetail } from '../lib/sync';

const API_URL = 'https://api.football-data.org/v4/competitions/WC/matches';

// Fases de eliminacion tal como se guardan en Firestore (castellano).
const KNOCKOUT = /ronda de 32|octavos|cuartos|semifinal|tercer puesto|final/i;

function counterDelta(points: number) {
  return { exact: points === 5 ? 1 : 0, correct: points === 3 ? 1 : 0 };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error('Falta FOOTBALL_DATA_API_KEY (env).');

  const res = await fetch(API_URL, {
    headers: { 'X-Auth-Token': apiKey },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { matches?: any[] };
  const apiByTime = new Map<string, any>();
  for (const am of data.matches ?? []) {
    apiByTime.set(new Date(am.utcDate).toISOString(), am);
  }

  const db = getAdminDb();
  const snap = await db.collection('matches').get();
  const knockout = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((m) => m.status === 'finished' && KNOCKOUT.test(m.stage ?? ''))
    .sort((a, b) => (a.scheduledAt?.toMillis?.() ?? 0) - (b.scheduledAt?.toMillis?.() ?? 0));

  console.log(`Modo: ${apply ? 'APPLY (escribe)' : 'DRY-RUN (solo muestra)'}`);
  console.log(`Cruces finalizados a revisar: ${knockout.length}\n`);

  for (const m of knockout) {
    const iso = m.scheduledAt?.toDate?.()?.toISOString?.();
    const am = apiByTime.get(iso);
    if (!am || am.status !== 'FINISHED') {
      console.log(`- ${m.id} ${m.homeTeam.code}-${m.awayTeam.code}: sin partido FINISHED en la API (${iso}) → omito`);
      continue;
    }

    const s90 = scoreAt90(am.score);
    if (s90.home == null || s90.away == null) continue;
    const detail = knockoutDetail(am.score);

    const old = m.result ? `${m.result.homeGoals}-${m.result.awayGoals}` : '—';
    const neu = `${s90.home}-${s90.away}`;
    const scoreChanged = !m.result || m.result.homeGoals !== s90.home || m.result.awayGoals !== s90.away;
    const detailStr = detail
      ? ` [${detail.duration} ganó ${detail.winner === 'home' ? m.homeTeam.code : m.awayTeam.code}]`
      : '';
    console.log(
      `- ${m.id} ${m.homeTeam.code}-${m.awayTeam.code}: 90' ${old} → ${neu}` +
        `${scoreChanged ? ' (CAMBIA)' : ''}${detailStr}`
    );

    if (!apply) continue;

    const predsSnap = await db
      .collection('predictions')
      .where('matchId', '==', m.id)
      .get();

    const batch = db.batch();
    batch.update(db.collection('matches').doc(m.id), {
      result: { homeGoals: s90.home, awayGoals: s90.away },
      status: 'finished',
      resultDetail: detail,
      liveScore: null,
    });

    let changed = 0;
    for (const doc of predsSnap.docs) {
      const p = doc.data();
      const newPoints = computePoints(
        p.predictedHomeGoals,
        p.predictedAwayGoals,
        s90.home,
        s90.away
      );
      const oldPoints = p.evaluated ? (p.pointsEarned ?? 0) : 0;
      if (p.evaluated && oldPoints === newPoints) continue;

      const oldC = counterDelta(oldPoints);
      const newC = counterDelta(newPoints);
      const pointsDelta = newPoints - oldPoints;
      const exactDelta = newC.exact - oldC.exact;
      const correctDelta = newC.correct - oldC.correct;

      batch.update(doc.ref, { pointsEarned: newPoints, evaluated: true });
      batch.update(db.collection('users').doc(p.userId), {
        ...(pointsDelta !== 0 && { totalPoints: FieldValue.increment(pointsDelta) }),
        ...(exactDelta !== 0 && { exactResults: FieldValue.increment(exactDelta) }),
        ...(correctDelta !== 0 && { correctResults: FieldValue.increment(correctDelta) }),
      });
      changed++;
    }

    await batch.commit();
    console.log(`    → aplicado. Pronosticos re-evaluados: ${changed}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
