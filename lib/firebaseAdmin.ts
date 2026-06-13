/**
 * Firebase Admin SDK (servidor): inicializacion unica y reutilizable.
 *
 * La usan tanto los scripts de CLI (scripts/*.ts) como la ruta serverless
 * app/api/sync/route.ts. En serverless solo existe la env FIREBASE_SERVICE_ACCOUNT;
 * en local cae al archivo scripts/serviceAccountKey.json.
 *
 * getApps() evita el "app already exists" cuando el modulo se reusa entre
 * invocaciones (warm starts en Vercel).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function loadServiceAccount() {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (fromEnv) return JSON.parse(fromEnv);
  const file = resolve(process.cwd(), 'scripts/serviceAccountKey.json');
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  throw new Error(
    'Falta FIREBASE_SERVICE_ACCOUNT (env) o scripts/serviceAccountKey.json'
  );
}

let app: App | undefined;

export function getAdminDb(): Firestore {
  if (!app) {
    app = getApps()[0] ?? initializeApp({ credential: cert(loadServiceAccount()) });
  }
  return getFirestore(app);
}
