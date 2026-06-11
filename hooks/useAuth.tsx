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
    const userRef = doc(getDbClient(), 'users', u.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        displayName: u.displayName ?? 'Jugador',
        email: u.email,
        photoURL: u.photoURL,
        totalPoints: 0,
        exactResults: 0,
        correctResults: 0,
        createdAt: serverTimestamp(),
      });
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
