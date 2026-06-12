'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

/**
 * Badges de comentarios no leidos. Un UNICO listener sobre los ultimos
 * comentarios de toda la coleccion (sin `where`, no necesita indice
 * compuesto) alimenta todos los badges: el del Foro en el Navbar y el del
 * toggle de comentarios de cada MatchCard. Abrir un listener por tarjeta
 * seria carisimo; este enfoque cuesta 1.
 *
 * La "ultima lectura" por hilo se guarda en localStorage por usuario
 * (por dispositivo, suficiente para el MVP). Hilo: 'global' para el foro,
 * el matchId para cada partido. Los comentarios propios no cuentan.
 */

const GLOBAL_THREAD = 'global';
const MAX_TRACKED = 150;

interface UnreadCommentsContextValue {
  /** threadKey: matchId, o null para el foro global. */
  unreadCount: (threadKey: string | null) => number;
  markRead: (threadKey: string | null) => void;
}

const UnreadCommentsContext = createContext<UnreadCommentsContextValue>({
  unreadCount: () => 0,
  markRead: () => {},
});

interface CommentMeta {
  threadKey: string;
  userId: string;
  createdAtMs: number;
}

const storageKey = (uid: string) => `prode-comments-read:${uid}`;

function loadLastRead(uid: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(storageKey(uid)) ?? '{}');
  } catch {
    return {};
  }
}

export function UnreadCommentsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [meta, setMeta] = useState<CommentMeta[]>([]);
  const [lastRead, setLastRead] = useState<Record<string, number>>({});

  useEffect(() => {
    setLastRead(user ? loadLastRead(user.uid) : {});
  }, [user]);

  useEffect(() => {
    if (!user) {
      setMeta([]);
      return;
    }
    const q = query(
      collection(getDbClient(), 'comments'),
      orderBy('createdAt', 'desc'),
      limit(MAX_TRACKED)
    );
    return onSnapshot(
      q,
      (snap) => {
        setMeta(
          snap.docs.map((doc) => {
            const d = doc.data();
            return {
              threadKey: d.matchId ?? GLOBAL_THREAD,
              userId: d.userId,
              // createdAt null = serverTimestamp pendiente (comentario propio
              // recien enviado); se filtra al contar.
              createdAtMs: d.createdAt?.toMillis?.() ?? 0,
            };
          })
        );
      },
      () => setMeta([])
    );
  }, [user]);

  const unread = useMemo(() => {
    if (!user) return {} as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const c of meta) {
      if (c.userId === user.uid || c.createdAtMs === 0) continue;
      if (c.createdAtMs > (lastRead[c.threadKey] ?? 0)) {
        counts[c.threadKey] = (counts[c.threadKey] ?? 0) + 1;
      }
    }
    return counts;
  }, [meta, lastRead, user]);

  const unreadCount = useCallback(
    (threadKey: string | null) => unread[threadKey ?? GLOBAL_THREAD] ?? 0,
    [unread]
  );

  const markRead = useCallback(
    (threadKey: string | null) => {
      if (!user) return;
      const key = threadKey ?? GLOBAL_THREAD;
      setLastRead((prev) => {
        const next = { ...prev, [key]: Date.now() };
        try {
          localStorage.setItem(storageKey(user.uid), JSON.stringify(next));
        } catch {
          // localStorage lleno o bloqueado: el badge se limpia igual en memoria
        }
        return next;
      });
    },
    [user]
  );

  const value = useMemo(() => ({ unreadCount, markRead }), [unreadCount, markRead]);

  return (
    <UnreadCommentsContext.Provider value={value}>
      {children}
    </UnreadCommentsContext.Provider>
  );
}

export function useUnreadComments() {
  return useContext(UnreadCommentsContext);
}
