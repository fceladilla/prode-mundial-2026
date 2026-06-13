/**
 * Sincroniza resultados desde football-data.org y evalua los pronosticos.
 * Es un thin wrapper sobre la logica compartida en lib/sync.ts (la misma que
 * usa la ruta serverless app/api/sync/route.ts). Pensado para correr desde
 * GitHub Actions (.github/workflows/sync-results.yml) o a mano.
 *
 * Credenciales:
 *   FOOTBALL_DATA_API_KEY     token de football-data.org (obligatorio)
 *   FIREBASE_SERVICE_ACCOUNT  JSON de la service account en una linea (CI);
 *                             local cae a scripts/serviceAccountKey.json
 *
 * Uso local:  npm run sync-results
 */
import { getAdminDb } from '../lib/firebaseAdmin';
import { runSync } from '../lib/sync';

async function main() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error('Falta FOOTBALL_DATA_API_KEY (env).');

  const summary = await runSync(getAdminDb(), apiKey);
  for (const line of summary.logs) console.log(line);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
