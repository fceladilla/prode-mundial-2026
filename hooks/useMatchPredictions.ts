'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';
import type { MatchStatus } from '@/lib/types';

export interface PublicPrediction {
  userId: string;
  displayName: string;
  photoURL: string;
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  pointsEarned: number;
  evaluated: boolean;
}

/**
 * Carga todas las predicciones de un partido.
 * Solo funciona (Firestore lo permite) cuando match.status !== 'upcoming'.
 * Devuelve array vacio si el partido todavia no empezo.
 */
export function useMatchPredictions(matchId: string, matchStatus: MatchStatus) {
  const [predictions, setPredictions] = useState<PublicPrediction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // No intentar leer si el partido no empezo (las rules bloquearian igual).
    if (matchStatus === 'upcoming') {
      setPredictions([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(getDbClient(), 'predictions'),
      where('matchId', '==', matchId)
    );

    return onSnapshot(
      q,
      (snap) => {
        setPredictions(
          snap.docs
            .map((doc) => {
              const d = doc.data();
              return {
                userId: d.userId,
                displayName: d.displayName ?? 'Jugador',
                photoURL: d.photoURL ?? '',
                predictedHomeGoals: d.predictedHomeGoals,
                predictedAwayGoals: d.predictedAwayGoals,
                pointsEarned: d.pointsEarned ?? 0,
                evaluated: d.evaluated ?? false,
              };
            })
            .sort((a, b) => b.pointsEarned - a.pointsEarned)
        );
        setLoading(false);
      },
      // Error silencioso si las rules bloquean (partido upcoming).
      () => setLoading(false)
    );
  }, [matchId, matchStatus]);

  return { predictions, loading };
}
