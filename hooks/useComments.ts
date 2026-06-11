'use client';

import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';

export interface Comment {
  id: string;
  userId: string;
  displayName: string;
  photoURL: string;
  text: string;
  createdAt: Date | null;
  matchId: string | null;
}

/**
 * matchId = null   -> foro global
 * matchId = "M001" -> comentarios del partido M001
 *
 * Requiere el indice compuesto (matchId ASC, createdAt DESC) declarado en
 * firestore.indexes.json.
 */
export function useComments(matchId: string | null = null, maxComments = 100) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
            };
          })
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [matchId, maxComments]);

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
    createdAt: serverTimestamp(),
  });
}
