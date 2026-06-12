'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMatchPredictions } from '@/hooks/useMatchPredictions';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDisplayName } from '@/lib/formatName';
import type { MatchStatus } from '@/lib/types';
import { Avatar } from './Avatar';

function PointsBadge({
  evaluated,
  points,
}: {
  evaluated: boolean;
  points: number;
}) {
  if (!evaluated) return null;
  if (points === 5)
    return <span className="font-display font-bold text-oro">🎯 5 pts</span>;
  if (points > 0)
    return (
      <span className="font-display font-bold text-estadio">★ {points} pts</span>
    );
  return <span className="text-suave">— 0 pts</span>;
}

/**
 * Lista de predicciones de todos los jugadores para un partido ya iniciado.
 * Con el partido "live" muestra solo el pronostico; con "finished", los puntos.
 */
export function MatchPredictionsPanel({
  matchId,
  matchStatus,
}: {
  matchId: string;
  matchStatus: MatchStatus;
}) {
  const { predictions, loading } = useMatchPredictions(matchId, matchStatus);
  const { t } = useLanguage();

  if (matchStatus === 'upcoming') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-lg bg-negro p-3"
    >
      <h3 className="mb-2 font-display text-sm font-bold text-oro">
        {t('predictionsTitle')} ({predictions.length}{' '}
        {predictions.length === 1 ? t('player') : t('players')})
      </h3>
      {loading ? (
        <p className="text-xs text-suave">{t('loading')}</p>
      ) : predictions.length === 0 ? (
        <p className="text-xs text-suave">{t('nobodyPredicted')}</p>
      ) : (
        <ul className="space-y-1">
          {predictions.map((p) => (
            <li key={p.userId}>
              <Link
                href={`/perfil/${p.userId}`}
                className="flex items-center gap-2 rounded-md bg-carbon px-2 py-1.5 text-sm transition hover:ring-1 hover:ring-oro/40"
              >
                <Avatar src={p.photoURL} name={p.displayName} size={24} />
                <span className="min-w-0 flex-1 truncate">
                  {formatDisplayName(p.displayName)}
                </span>
                <span className="font-display font-bold">
                  {p.predictedHomeGoals} - {p.predictedAwayGoals}
                </span>
                <span className="w-16 text-right text-xs">
                  <PointsBadge evaluated={p.evaluated} points={p.pointsEarned} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
