/**
 * Carga el resultado de un partido y evalua los pronosticos: asigna los puntos
 * y actualiza el ranking. Corre local con la service account (Admin SDK), sin
 * necesidad de Cloud Functions ni plan Blaze.
 *
 * La logica de puntos vive en lib/scoring.ts (la misma que usaria la Cloud
 * Function el dia que la implementemos).
 *
 * Uso:  npm run set-result -- <matchId> <golesLocal> <golesVisitante>
 * Ej:   npm run set-result -- match-001 2 1
 *
 * Es idempotente: re-ejecutarlo no duplica puntos (omite los pronosticos ya
 * evaluados).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { computePoints } from '../lib/scoring';

async function main() {
  const [matchId, homeRaw, awayRaw] = process.argv.slice(2);
  if (!matchId || homeRaw === undefined || awayRaw === undefined) {
    console.error(
      'Uso: npm run set-result -- <matchId> <golesLocal> <golesVisitante>'
    );
    console.error('Ej:  npm run set-result -- match-001 2 1');
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

  // Un pronostico por usuario por partido: leemos por matchId y filtramos en
  // codigo (asi no dependemos de ningun indice compuesto).
  const predsSnap = await db
    .collection('predictions')
    .where('matchId', '==', matchId)
    .get();

  const batch = db.batch();
  batch.update(matchRef, {
    result: { homeGoals, awayGoals },
    status: 'finished',
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
    const exact = points === 5;
    const correct = points === 2;

    batch.update(doc.ref, { pointsEarned: points, evaluated: true });
    batch.update(db.collection('users').doc(p.userId), {
      totalPoints: FieldValue.increment(points),
      ...(exact && { exactResults: FieldValue.increment(1) }),
      ...(correct && { correctResults: FieldValue.increment(1) }),
    });
    evaluated++;
  }

  await batch.commit();

  const m = matchSnap.data()!;
  console.log(
    `OK: ${m.homeTeam.code} ${homeGoals}-${awayGoals} ${m.awayTeam.code} (${matchId}) -> finished`
  );
  console.log(
    `Pronosticos evaluados: ${evaluated}` +
      (skipped ? ` | ya evaluados antes (omitidos): ${skipped}` : '')
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
