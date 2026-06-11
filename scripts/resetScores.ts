/**
 * Resetea el estado de prueba para arrancar limpio el torneo real:
 *   - borra TODOS los pronosticos
 *   - pone en 0 los puntos y contadores de TODOS los usuarios
 *   - borra los partidos de muestra viejos (match-001..match-008)
 *
 * Uso: npm run reset-scores
 *
 * Destructivo: usar solo antes del lanzamiento (o para reiniciar el juego).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function commitInChunks<T>(
  db: FirebaseFirestore.Firestore,
  items: T[],
  apply: (batch: FirebaseFirestore.WriteBatch, item: T) => void
): Promise<number> {
  let batch = db.batch();
  let ops = 0;
  let done = 0;
  for (const item of items) {
    apply(batch, item);
    ops++;
    done++;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return done;
}

async function main() {
  const sa = JSON.parse(
    readFileSync(resolve(process.cwd(), 'scripts/serviceAccountKey.json'), 'utf8')
  );
  initializeApp({ credential: cert(sa) });
  const db = getFirestore();

  const preds = await db.collection('predictions').get();
  const delPreds = await commitInChunks(db, preds.docs, (b, d) => b.delete(d.ref));

  const users = await db.collection('users').get();
  const resetUsers = await commitInChunks(db, users.docs, (b, d) =>
    b.update(d.ref, { totalPoints: 0, exactResults: 0, correctResults: 0 })
  );

  const oldIds = Array.from({ length: 8 }, (_, i) => `match-${String(i + 1).padStart(3, '0')}`);
  const delOld = await commitInChunks(db, oldIds, (b, id) =>
    b.delete(db.collection('matches').doc(id))
  );

  console.log(`Pronosticos borrados:        ${delPreds}`);
  console.log(`Usuarios reseteados a 0:      ${resetUsers}`);
  console.log(`Partidos de muestra borrados: ${delOld}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
