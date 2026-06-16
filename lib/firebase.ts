import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

/**
 * Inicializacion perezosa de Firebase. Estos getters solo se invocan desde el
 * cliente (dentro de effects o handlers), nunca durante el prerender del build,
 * para que `next build` no falle por la falta de variables de entorno.
 */
export function getAuthClient(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

/**
 * Firestore con **cache local persistente** (IndexedDB). Es la mayor palanca
 * para no agotar la cuota gratuita de lecturas: con el cache persistente, las
 * queries `onSnapshot` se sirven primero desde IndexedDB y al recargar/volver
 * solo se leen del servidor los documentos que cambiaron (resume tokens), en
 * vez de releer todo el fixture / posiciones / comentarios en cada carga.
 * `persistentMultipleTabManager` coordina varias pestanas abiertas a la vez.
 * Si el navegador no soporta IndexedDB (modo privado, etc.) cae a memoria.
 */
export function getDbClient(): Firestore {
  if (dbInstance) return dbInstance;
  try {
    dbInstance = initializeFirestore(getFirebaseApp(), {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // Ya estaba inicializado (HMR) o el entorno no permite cache persistente:
    // usamos la instancia por defecto (cache en memoria).
    dbInstance = getFirestore(getFirebaseApp());
  }
  return dbInstance;
}

export const googleProvider = new GoogleAuthProvider();
