'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
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
    return onAuthStateChanged(getAuthClient(), (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signIn = async () => {
    const result = await signInWithPopup(getAuthClient(), googleProvider);
    const u = result.user;

    // Crear el perfil en Firestore la primera vez que ingresa.
    // displayNameLower habilita el prefix-search de la barra de busqueda
    // (Firestore no tiene full-text search).
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
  };

  const logout = () => signOut(getAuthClient());

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
