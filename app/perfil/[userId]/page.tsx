'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { formatDisplayName } from '@/lib/formatName';
import type { LeaderboardUser, Match, Prediction } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { Flag } from '@/components/Flag';

interface RevealedPrediction {
  match: Match;
  prediction: Prediction;
}

function PointsBadge({ p }: { p: Prediction }) {
  if (!p.evaluated) return <span className="text-suave">pendiente</span>;
  if (p.pointsEarned === 5)
    return <span className="font-display font-bold text-oro">🎯 5 pts</span>;
  if (p.pointsEarned === 2)
    return <span className="font-display font-bold text-estadio">★ 2 pts</span>;
  return <span className="text-suave">— 0 pts</span>;
}

export default function PerfilPage({
  params,
}: {
  params: { userId: string };
}) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<LeaderboardUser | null>(null);
  const [revealed, setRevealed] = useState<RevealedPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const db = getDbClient();

    (async () => {
      const userSnap = await getDoc(doc(db, 'users', params.userId));
      if (cancelled) return;
      if (!userSnap.exists()) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile({
        id: userSnap.id,
        ...(userSnap.data() as Omit<LeaderboardUser, 'id'>),
      });

      // Solo partidos ya iniciados: las rules permiten leer predicciones
      // ajenas unicamente cuando el partido no esta "upcoming". Se leen los
      // docs por id ({userId}_{matchId}) porque una query por userId ajeno
      // seria rechazada por las rules.
      const matchesSnap = await getDocs(
        query(
          collection(db, 'matches'),
          where('status', 'in', ['live', 'finished']),
          orderBy('scheduledAt', 'desc')
        )
      );
      const matches = matchesSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Match, 'id'>),
      }));

      const predSnaps = await Promise.all(
        matches.map((m) =>
          getDoc(doc(db, 'predictions', `${params.userId}_${m.id}`)).catch(
            () => null
          )
        )
      );
      if (cancelled) return;

      const rows: RevealedPrediction[] = [];
      predSnaps.forEach((snap, i) => {
        if (snap?.exists()) {
          rows.push({ match: matches[i], prediction: snap.data() as Prediction });
        }
      });
      setRevealed(rows);
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [params.userId]);

  if (loading) {
    return <p className="text-suave">Cargando perfil...</p>;
  }

  if (notFound || !profile) {
    return (
      <div className="rounded-xl border border-white/10 bg-carbon p-6 text-suave">
        No encontramos este jugador.
      </div>
    );
  }

  const isMe = user?.uid === profile.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {isMe && (
        <div className="rounded-md bg-oro/15 px-4 py-2 text-sm text-oro ring-1 ring-oro/40">
          Este es tu perfil
        </div>
      )}

      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-negro p-6">
        <Avatar src={profile.photoURL} name={profile.displayName} size={72} />
        <div>
          <h1 className="font-display text-2xl font-bold">
            {formatDisplayName(profile.displayName)}
          </h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="font-display font-bold text-oro">
              🏆 {profile.totalPoints ?? 0} pts
            </span>
            <span className="text-suave">
              🎯 {profile.exactResults ?? 0} exactos
            </span>
            <span className="text-suave">
              ✓ {profile.correctResults ?? 0} aciertos
            </span>
          </div>
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold text-oro">
          Predicciones reveladas
        </h2>
        {revealed.length === 0 ? (
          <p className="text-sm text-suave">
            Todavia no hay predicciones reveladas: se muestran recien cuando el
            partido pronosticado comienza.
          </p>
        ) : (
          <ul className="space-y-2">
            {revealed.map(({ match, prediction }) => (
              <li
                key={match.id}
                className="flex items-center gap-3 rounded-lg bg-carbon px-3 py-2 text-sm"
              >
                <Flag
                  flag={match.homeTeam.flag}
                  code={match.homeTeam.code}
                  name={match.homeTeam.name}
                  height={14}
                />
                <span className="font-display font-semibold">
                  {match.homeTeam.code} vs {match.awayTeam.code}
                </span>
                <Flag
                  flag={match.awayTeam.flag}
                  code={match.awayTeam.code}
                  name={match.awayTeam.name}
                  height={14}
                />
                <span className="flex-1 text-right font-display font-bold">
                  {prediction.predictedHomeGoals}-{prediction.predictedAwayGoals}
                </span>
                <span className="w-20 text-right text-xs">
                  <PointsBadge p={prediction} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </motion.div>
  );
}
