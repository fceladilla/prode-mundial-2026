'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getAuthClient, getDbClient, googleProvider } from '@/lib/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * En navegadores moviles signInWithPopup es poco confiable (el popup se cierra
 * al volver a la app y la sesion se pierde en silencio), asi que ahi usamos
 * signInWithRedirect. En desktop usamos popup, con redirect como fallback si el
 * navegador lo bloquea.
 */
function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
]);

// Crea el perfil en Firestore la primera vez que ingresa; en ingresos
// posteriores refresca nombre/foto. displayNameLower habilita el prefix-search
// de la barra de busqueda (Firestore no tiene full-text search).
async function upsertUserProfile(u: User): Promise<void> {
  const displayName = u.displayName ?? 'Jugador';
  const userRef = doc(getDbClient(), 'users', u.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      displayName,
      displayNameLower: displayName.toLowerCase(),
      email: u.email,
      photoURL: u.photoURL,
      totalPoints: 0,
      exactResults: 0,
      correctResults: 0,
      createdAt: serverTimestamp(),
    });
  } else {
    // Backfill para usuarios creados antes de que existiera displayNameLower
    // (y refresco de nombre/foto si cambiaron en Google).
    await setDoc(
      userRef,
      {
        displayName,
        displayNameLower: displayName.toLowerCase(),
        photoURL: u.photoURL,
      },
      { merge: true }
    );
  }
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Procesar el retorno de signInWithRedirect (movil): al volver de Google,
    // getRedirectResult trae el usuario y creamos/actualizamos su perfil.
    getRedirectResult(getAuthClient())
      .then((result) => {
        if (result?.user) return upsertUserProfile(result.user);
      })
      .catch((err) => console.error('Error en sign-in por redirect:', err));

    return onAuthStateChanged(getAuthClient(), (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signIn = async () => {
    const auth = getAuthClient();

    // Movil: redirect directo (el popup es poco confiable). La app recarga al
    // volver de Google y el perfil se crea en getRedirectResult (ver effect).
    if (isMobile()) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      await upsertUserProfile(result.user);
    } catch (err) {
      // Desktop con popup bloqueado/cerrado: caemos a redirect.
      const code = (err as { code?: string }).code ?? '';
      if (POPUP_FALLBACK_CODES.has(code)) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw err;
    }
  };

  const logout = () => signOut(getAuthClient());

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
