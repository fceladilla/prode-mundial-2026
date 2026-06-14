'use client';

import { useEffect, useState } from 'react';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

/** Cita del comentario al que se responde (snapshot inmutable). */
export interface ReplyRef {
  id: string;
  userId: string;
  displayName: string;
  text: string;
}

export interface Comment {
  id: string;
  userId: string;
  displayName: string;
  photoURL: string;
  text: string;
  createdAt: Date | null;
  matchId: string | null;
  likes: string[];
  mentions: string[];
  replyTo: ReplyRef | null;
  edited: boolean;
}

// Las menciones se codifican dentro del texto como @[Nombre](uid). Es
// inequivoco (el uid desambigua nombres repetidos y soporta espacios) y se
// parsea facil al renderizar; el array `mentions` se deriva de aca.
const MENTION_RE = /@\[[^\]]+\]\(([^)]+)\)/g;

/** uids unicos mencionados en el texto. */
export function parseMentions(text: string): string[] {
  const ids = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) ids.add(m[1]);
  return [...ids];
}

/** Reemplaza @[Nombre](uid) por @Nombre, para previews/citas en texto plano. */
export function stripMentionMarkup(text: string): string {
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

/**
 * matchId = null   -> foro global
 * matchId = "M001" -> comentarios del partido M001
 *
 * Requiere el indice compuesto (matchId ASC, createdAt DESC) declarado en
 * firestore.indexes.json. Las reglas exigen sesion iniciada para leer, asi
 * que sin usuario no se abre el listener (evita permission-denied).
 */
export function useComments(matchId: string | null = null, maxComments = 100) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const q = query(
      collection(getDbClient(), 'comments'),
      where('matchId', '==', matchId),
      orderBy('createdAt', 'desc'),
      limit(maxComments)
    );

    return onSnapshot(
      q,
      (snap) => {
        setComments(
          snap.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              userId: d.userId,
              displayName: d.displayName,
              photoURL: d.photoURL,
              text: d.text,
              createdAt: d.createdAt?.toDate() ?? null,
              matchId: d.matchId ?? null,
              likes: d.likes ?? [],
              mentions: d.mentions ?? [],
              replyTo: d.replyTo ?? null,
              edited: d.edited ?? false,
            };
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [user, matchId, maxComments]);

  return { comments, loading };
}

export async function postComment(
  userId: string,
  displayName: string,
  photoURL: string,
  text: string,
  matchId: string | null = null,
  replyTo: ReplyRef | null = null
) {
  const trimmed = text.trim().slice(0, 500);
  await addDoc(collection(getDbClient(), 'comments'), {
    userId,
    displayName,
    photoURL,
    text: trimmed,
    matchId,
    likes: [],
    mentions: parseMentions(trimmed),
    replyTo,
    createdAt: serverTimestamp(),
  });
}

/**
 * Edita el texto del propio comentario. Re-deriva las menciones y marca
 * `edited`. Las reglas solo permiten al autor tocar text/mentions/edited.
 */
export async function editComment(commentId: string, text: string) {
  const trimmed = text.trim().slice(0, 500);
  await updateDoc(doc(getDbClient(), 'comments', commentId), {
    text: trimmed,
    mentions: parseMentions(trimmed),
    edited: true,
  });
}

/** Borra el propio comentario (las reglas exigen ser el autor). */
export async function deleteComment(commentId: string) {
  await deleteDoc(doc(getDbClient(), 'comments', commentId));
}

/** Da o quita el "me gusta" del usuario sobre un comentario. */
export async function toggleLike(commentId: string, uid: string, liked: boolean) {
  await updateDoc(doc(getDbClient(), 'comments', commentId), {
    likes: liked ? arrayRemove(uid) : arrayUnion(uid),
  });
}

export interface Liker {
  id: string;
  displayName: string;
  photoURL: string;
}

// Cache en memoria: los perfiles casi no cambian y un mismo usuario suele
// aparecer en varios likes, asi que evita releer el mismo doc por popover.
const likerCache = new Map<string, Liker>();

/**
 * Resuelve los uid del array `likes` a nombre/avatar leyendo `users/{uid}`
 * (coleccion de lectura publica). Las lecturas van en paralelo y se cachean.
 * Mantiene el orden recibido y descarta usuarios borrados/ilegibles.
 */
export async function fetchLikers(uids: string[]): Promise<Liker[]> {
  const db = getDbClient();
  const results = await Promise.all(
    uids.map(async (uid) => {
      const cached = likerCache.get(uid);
      if (cached) return cached;
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (!snap.exists()) return null;
        const d = snap.data();
        const liker: Liker = {
          id: uid,
          displayName: d.displayName ?? 'Jugador',
          photoURL: d.photoURL ?? '',
        };
        likerCache.set(uid, liker);
        return liker;
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is Liker => r !== null);
}
