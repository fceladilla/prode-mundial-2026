'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Flag } from './Flag';
import { CommentSection } from './CommentSection';
import { MatchPredictionsPanel } from './MatchPredictionsPanel';
import { formatLocalKickoff } from '@/lib/time';
import type { Match, Prediction } from '@/lib/types';

type DisplayStatus = 'upcoming' | 'closed' | 'live' | 'finished';

const STATUS: Record<DisplayStatus, { text: string; className: string }> = {
  upcoming: { text: 'PROXIMO', className: 'bg-acero text-white' },
  closed: { text: 'CERRADO', className: 'bg-suave/30 text-suave' },
  live: { text: 'EN VIVO', className: 'bg-rojo text-white animate-pulse' },
  finished: { text: 'FINALIZADO', className: 'bg-estadio text-white' },
};

function TeamRow({ team }: { team: Match['homeTeam'] }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Flag flag={team.flag} code={team.code} name={team.name} height={18} />
      <span className="truncate font-display font-semibold">{team.name}</span>
    </div>
  );
}

export function MatchCard({
  match,
  prediction,
  index = 0,
}: {
  match: Match;
  prediction?: Prediction;
  index?: number;
}) {
  const { user } = useAuth();
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    if (prediction) {
      setHome(String(prediction.predictedHomeGoals));
      setAway(String(prediction.predictedAwayGoals));
    }
  }, [prediction]);

  // Bloqueo: el pronostico se cierra cuando el partido empieza (por hora) o
  // cuando ya no esta "upcoming" (resultado cargado).
  const kickoffMs = match.scheduledAt?.toMillis?.() ?? 0;

  // Hora en la zona local del usuario. Arranca con la hora ARG precomputada
  // (igual en server y en el primer render del cliente) y, tras montar,
  // pasamos a la hora local del navegador para no romper la hidratacion.
  const [kickoffLabel, setKickoffLabel] = useState(match.scheduledAtARG);
  useEffect(() => {
    if (kickoffMs > 0) setKickoffLabel(formatLocalKickoff(kickoffMs));
  }, [kickoffMs]);
  const started = kickoffMs > 0 && Date.now() >= kickoffMs;
  const locked = match.status !== 'upcoming' || started;
  const canPredict = !!user && !locked;

  const displayStatus: DisplayStatus =
    match.status === 'finished'
      ? 'finished'
      : match.status === 'live'
        ? 'live'
        : started
          ? 'closed'
          : 'upcoming';
  const st = STATUS[displayStatus];

  const save = async () => {
    if (!user) return;
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (Number.isNaN(h) || Number.isNaN(a) || h < 0 || a < 0) return;

    setSaving(true);
    try {
      await setDoc(
        doc(getDbClient(), 'predictions', `${user.uid}_${match.id}`),
        {
          userId: user.uid,
          matchId: match.id,
          displayName: user.displayName ?? 'Jugador',
          photoURL: user.photoURL ?? '',
          predictedHomeGoals: h,
          predictedAwayGoals: a,
          pointsEarned: 0,
          evaluated: false,
          submittedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.25 }}
      className="rounded-xl border border-white/10 bg-carbon p-4"
      id={`match-${match.id}`}
    >
      <div className="mb-3 flex items-center justify-between text-xs text-suave">
        <span title={`ARG ${match.scheduledAtARG} · ESP ${match.scheduledAtESP}`}>
          {kickoffLabel} &middot; {match.venue.city}
        </span>
        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${st.className}`}>
          {st.text}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <TeamRow team={match.homeTeam} />
          <TeamRow team={match.awayTeam} />
        </div>

        {match.status === 'finished' && match.result ? (
          <div className="text-center font-display text-3xl font-bold leading-tight">
            <div>{match.result.homeGoals}</div>
            <div>{match.result.awayGoals}</div>
          </div>
        ) : canPredict ? (
          <div className="flex flex-col gap-2">
            <input
              inputMode="numeric"
              value={home}
              onChange={(e) => setHome(e.target.value.replace(/\D/g, ''))}
              maxLength={2}
              aria-label={`Goles ${match.homeTeam.name}`}
              className="h-9 w-12 rounded bg-negro text-center font-display text-lg outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-oro"
            />
            <input
              inputMode="numeric"
              value={away}
              onChange={(e) => setAway(e.target.value.replace(/\D/g, ''))}
              maxLength={2}
              aria-label={`Goles ${match.awayTeam.name}`}
              className="h-9 w-12 rounded bg-negro text-center font-display text-lg outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-oro"
            />
          </div>
        ) : (
          <div className="text-right font-display text-sm text-suave">
            {prediction
              ? `Tu pronostico: ${prediction.predictedHomeGoals}-${prediction.predictedAwayGoals}`
              : started
                ? '🔒'
                : '—'}
          </div>
        )}
      </div>

      {canPredict && (
        <div className="mt-3 flex items-center justify-end gap-3">
          {prediction && (
            <span className="text-xs text-suave">
              Guardado: {prediction.predictedHomeGoals}-
              {prediction.predictedAwayGoals}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving || home === '' || away === ''}
            className="rounded-md bg-oro px-4 py-1.5 text-sm font-semibold text-negro transition hover:bg-oro/90 disabled:opacity-40"
          >
            {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      )}

      {match.status === 'finished' && prediction?.evaluated && (
        <div className="mt-3 border-t border-white/10 pt-2 text-right text-sm">
          <span className="text-suave">
            Tu pronostico {prediction.predictedHomeGoals}-
            {prediction.predictedAwayGoals} &middot;{' '}
          </span>
          <span className="font-display font-bold text-oro">
            +{prediction.pointsEarned} pts
          </span>
        </div>
      )}

      {!user && !locked && (
        <p className="mt-3 text-right text-xs text-suave">
          Ingresa para pronosticar
        </p>
      )}

      {/* Predicciones de todos (solo post-inicio) y comentarios del partido,
          plegados por defecto para no abrir listeners en cada tarjeta. */}
      <div className="mt-3 flex gap-4 border-t border-white/10 pt-2 text-xs text-suave">
        {match.status !== 'upcoming' && (
          <button
            onClick={() => setShowPredictions((v) => !v)}
            className="hover:text-white"
          >
            📊 Predicciones {showPredictions ? '▴' : '▾'}
          </button>
        )}
        <button
          onClick={() => setShowComments((v) => !v)}
          className="hover:text-white"
        >
          💬 Comentarios {showComments ? '▴' : '▾'}
        </button>
      </div>

      {showPredictions && match.status !== 'upcoming' && (
        <MatchPredictionsPanel matchId={match.id} matchStatus={match.status} />
      )}
      {showComments && (
        <div className="mt-3">
          <CommentSection matchId={match.id} />
        </div>
      )}
    </motion.div>
  );
}
