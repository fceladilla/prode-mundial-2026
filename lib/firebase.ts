import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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

export function getDbClient(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(getFirebaseApp());
  return dbInstance;
}

export const googleProvider = new GoogleAuthProvider();
