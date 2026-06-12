/**
 * Migracion retroactiva del cambio de puntaje (2026-06-12): el acierto de
 * resultado paso de 2 a 3 puntos. Toma todo pronostico ya evaluado con
 * pointsEarned == 2, lo sube a 3 y le acredita +1 punto al totalPoints del
 * usuario. `correctResults` no cambia (la cantidad de aciertos es la misma).
 *
 * Es idempotente: despues de correrla no queda ningun pronostico en 2 pts,
 * asi que re-ejecutarla no suma nada.
 *
 * Uso:  npm run migrate-3pts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Limite de Firestore: 500 operaciones por batch; cada pronostico usa 2.
const PREDS_PER_BATCH = 200;

async function main() {
  const serviceAccount = JSON.parse(
    readFileSync(resolve(process.cwd(), 'scripts/serviceAccountKey.json'), 'utf8')
  );
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  const predsSnap = await db
    .collection('predictions')
    .where('pointsEarned', '==', 2)
    .get();

  if (predsSnap.empty) {
    console.log('No hay pronosticos con 2 puntos: nada que migrar.');
    return;
  }

  const docs = predsSnap.docs.filter((doc) => doc.data().evaluated === true);
  let migrated = 0;
  const perUser = new Map<string, number>();

  for (let i = 0; i < docs.length; i += PREDS_PER_BATCH) {
    const batch = db.batch();
    for (const doc of docs.slice(i, i + PREDS_PER_BATCH)) {
      const p = doc.data();
      batch.update(doc.ref, { pointsEarned: 3 });
      batch.update(db.collection('users').doc(p.userId), {
        totalPoints: FieldValue.increment(1),
      });
      perUser.set(p.userId, (perUser.get(p.userId) ?? 0) + 1);
      migrated++;
    }
    await batch.commit();
  }

  console.log(`OK: ${migrated} pronosticos migrados de 2 a 3 puntos.`);
  for (const [userId, count] of perUser) {
    console.log(`  ${userId}: +${count} pts`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
