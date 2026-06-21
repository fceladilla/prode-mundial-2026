/**
 * Corrige el resultado de un partido YA finalizado (uno cuyos pronosticos ya
 * fueron evaluados). A diferencia de set-result -que es idempotente y omite los
 * pronosticos ya evaluados-, este script REVIERTE los puntos viejos de cada
 * usuario y vuelve a evaluar con el nuevo marcador.
 *
 * Para cada pronostico ya evaluado:
 *   - resta el `pointsEarned` viejo de users.totalPoints
 *   - decrementa exactResults/correctResults segun los puntos viejos (5 -> exacto,
 *     3 -> ganador)
 *   - recalcula los puntos con el nuevo marcador (lib/scoring.ts)
 *   - suma los puntos nuevos e incrementa los contadores que correspondan
 * Los pronosticos sin evaluar (si los hubiera) se evaluan normalmente.
 *
 * Tambien actualiza matches/{id}.result y status: 'finished'.
 *
 * Uso: npm run correct-result -- <matchId> <golesLocal> <golesVisitante>
 * Ej:  npm run correct-result -- match-040 4 0
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { computePoints } from '../lib/scoring';

function counterDelta(points: number) {
  // 5 = marcador exacto, 3 = ganador/empate correcto
  return {
    exact: points === 5 ? 1 : 0,
    correct: points === 3 ? 1 : 0,
  };
}

async function main() {
  const [matchId, homeRaw, awayRaw] = process.argv.slice(2);
  if (!matchId || homeRaw === undefined || awayRaw === undefined) {
    console.error('Uso: npm run correct-result -- <matchId> <golesLocal> <golesVisitante>');
    console.error('Ej:  npm run correct-result -- match-040 4 0');
    process.exit(1);
  }

  const homeGoals = Number(homeRaw);
  const awayGoals = Number(awayRaw);
  if (
    !Number.isInteger(homeGoals) ||
    !Number.isInteger(awayGoals) ||
    homeGoals < 0 ||
    awayGoals < 0
  ) {
    console.error('Los goles deben ser numeros enteros >= 0.');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(
    readFileSync(resolve(process.cwd(), 'scripts/serviceAccountKey.json'), 'utf8')
  );
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  const matchRef = db.collection('matches').doc(matchId);
  const matchSnap = await matchRef.get();
  if (!matchSnap.exists) {
    console.error(`No existe el partido "${matchId}".`);
    process.exit(1);
  }
  const m = matchSnap.data()!;
  const oldResult = m.result
    ? `${m.result.homeGoals}-${m.result.awayGoals}`
    : '(sin resultado)';
  console.log(
    `Partido: ${m.homeTeam.code} vs ${m.awayTeam.code} (${matchId})`
  );
  console.log(`Resultado viejo: ${oldResult}  ->  nuevo: ${homeGoals}-${awayGoals}`);

  const predsSnap = await db
    .collection('predictions')
    .where('matchId', '==', matchId)
    .get();

  const batch = db.batch();
  batch.update(matchRef, {
    result: { homeGoals, awayGoals },
    status: 'finished',
  });

  let changed = 0;
  let unchanged = 0;
  for (const doc of predsSnap.docs) {
    const p = doc.data();
    const newPoints = computePoints(
      p.predictedHomeGoals,
      p.predictedAwayGoals,
      homeGoals,
      awayGoals
    );
    const oldPoints = p.evaluated ? (p.pointsEarned ?? 0) : 0;

    if (p.evaluated && oldPoints === newPoints) {
      // Mismo puntaje: no toco el total ni los contadores.
      unchanged++;
      continue;
    }

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

  console.log(
    `OK: ${m.homeTeam.code} ${homeGoals}-${awayGoals} ${m.awayTeam.code} (${matchId}) -> finished`
  );
  console.log(
    `Pronosticos corregidos: ${changed}` +
      (unchanged ? ` | sin cambios de puntaje: ${unchanged}` : '')
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
