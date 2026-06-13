'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';

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
 * Solo funciona (Firestore lo permite) una vez que el partido empezo; el
 * llamador pasa `enabled` con ese criterio (hora de inicio cumplida o status
 * distinto de "upcoming"). Devuelve array vacio si todavia no empezo.
 */
export function useMatchPredictions(matchId: string, enabled: boolean) {
  const [predictions, setPredictions] = useState<PublicPrediction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // No intentar leer si el partido no empezo (las rules bloquearian igual).
    if (!enabled) {
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
  }, [matchId, enabled]);

  return { predictions, loading };
}
