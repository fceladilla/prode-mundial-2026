'use client';

import { useEffect, useState } from 'react';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
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

export interface Comment {
  id: string;
  userId: string;
  displayName: string;
  photoURL: string;
  text: string;
  createdAt: Date | null;
  matchId: string | null;
  likes: string[];
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
  matchId: string | null = null
) {
  await addDoc(collection(getDbClient(), 'comments'), {
    userId,
    displayName,
    photoURL,
    text: text.trim().slice(0, 500),
    matchId,
    likes: [],
    createdAt: serverTimestamp(),
  });
}

/** Da o quita el "me gusta" del usuario sobre un comentario. */
export async function toggleLike(commentId: string, uid: string, liked: boolean) {
  await updateDoc(doc(getDbClient(), 'comments', commentId), {
    likes: liked ? arrayRemove(uid) : arrayUnion(uid),
  });
}
