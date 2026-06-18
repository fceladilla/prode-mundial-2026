'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { argDateKey } from '@/lib/dates';
import { formatLocalKickoff } from '@/lib/time';
import type { Match } from '@/lib/types';
import { Flag } from './Flag';

const pad2 = (n: number) => String(n).padStart(2, '0');
const ms = (m: Match) => m.scheduledAt?.toMillis?.() ?? 0;

function scrollToMatch(id: string) {
  document
    .getElementById(`match-${id}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function JumpButton({ matchId, label }: { matchId: string; label: string }) {
  return (
    <motion.button
      type="button"
      onClick={() => scrollToMatch(matchId)}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      className="inline-flex items-center rounded-md bg-oro px-3 py-1 text-xs font-semibold text-negro transition hover:bg-oro/90"
    >
      {label}
    </motion.button>
  );
}

function Matchup({ match }: { match: Match }) {
  return (
    <div className="flex items-center gap-2 font-display text-lg font-semibold">
      <Flag
        flag={match.homeTeam.flag}
        code={match.homeTeam.code}
        name={match.homeTeam.name}
        height={20}
      />
      <span className="truncate">{match.homeTeam.name}</span>
      <span className="text-suave">vs</span>
      <Flag
        flag={match.awayTeam.flag}
        code={match.awayTeam.code}
        name={match.awayTeam.name}
        height={20}
      />
      <span className="truncate">{match.awayTeam.name}</span>
    </div>
  );
}

function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="min-w-[2.5rem] rounded-lg bg-black/35 px-1.5 py-1 text-center font-display text-xl font-bold tabular-nums ring-1 ring-white/10">
        {/* La cifra "voltea" al cambiar para dar sensacion de reloj vivo. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="block"
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-0.5 text-[9px] uppercase tracking-wide text-suave">
        {label}
      </span>
    </div>
  );
}

function Countdown({ kickoffMs, now }: { kickoffMs: number; now: number }) {
  const { t } = useLanguage();
  const totalSec = Math.max(0, Math.floor((kickoffMs - now) / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  return (
    <div className="flex gap-1.5">
      <CountdownUnit value={String(days)} label={t('heroUnitDays')} />
      <CountdownUnit value={pad2(hours)} label={t('heroUnitHours')} />
      <CountdownUnit value={pad2(mins)} label={t('heroUnitMin')} />
      <CountdownUnit value={pad2(secs)} label={t('heroUnitSec')} />
    </div>
  );
}

/**
 * Fila de un partido del dia: el matchup a la izquierda y, a la derecha, el
 * badge EN VIVO si ya arranco o su cuenta regresiva si esta por venir. El boton
 * lleva a la tarjeta del partido mas abajo.
 */
function MatchRow({ match, now }: { match: Match; now: number }) {
  const { t, tStage } = useLanguage();
  const kickoffMs = ms(match);
  const finished = match.status === 'finished';
  const started = !finished && kickoffMs > 0 && kickoffMs <= now;

  // Hora local del kickoff (igual patron que MatchCard: arranca con ARG y pasa
  // a la zona del navegador tras montar, para no romper la hidratacion).
  const [kickoffLabel, setKickoffLabel] = useState(match.scheduledAtARG ?? '');
  useEffect(() => {
    if (kickoffMs > 0) setKickoffLabel(formatLocalKickoff(kickoffMs));
  }, [kickoffMs]);

  return (
    <div className="flex flex-col gap-2 border-t border-white/10 pt-3 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Matchup match={match} />
        <p className="mt-1 text-xs text-suave">
          {tStage(match.stage)} &middot; {kickoffLabel} &middot; {match.venue.city}
        </p>
      </div>

      {finished ? (
        <div className="flex shrink-0 items-center gap-3 self-start">
          {match.result && (
            <span className="font-display text-xl font-bold tabular-nums text-oro">
              {match.result.homeGoals} - {match.result.awayGoals}
            </span>
          )}
          <span className="rounded-full bg-estadio px-3 py-1.5 text-sm font-bold text-white">
            {t('statusFinished')}
          </span>
          <JumpButton matchId={match.id} label={t('heroViewMatch')} />
        </div>
      ) : started ? (
        <div className="flex shrink-0 items-center gap-3 self-start">
          <span className="inline-flex items-center gap-2 rounded-full bg-rojo px-3 py-1.5 text-sm font-bold text-white">
            <span className="h-2 w-2 animate-ping rounded-full bg-white" />
            {t('statusLive')}
          </span>
          <JumpButton matchId={match.id} label={t('heroViewMatch')} />
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-3 self-start">
          <Countdown kickoffMs={kickoffMs} now={now} />
          <JumpButton matchId={match.id} label={t('heroEditPrediction')} />
        </div>
      )}
    </div>
  );
}

/**
 * Hero del home con identidad de Mundial. Muestra los partidos del DIA: los que
 * estan en vivo con su badge y los proximos con su cuenta regresiva. Si hoy no
 * hay partidos pendientes, cae al proximo partido del fixture.
 *
 * IMPORTANTE: no abre ningun listener ni lee Firestore. Recibe `matches` (los no
 * finalizados, ya en memoria desde el snapshot de la home) y resuelve dia/vivo
 * con un timer local de 1s. Cero lecturas extra.
 */
export function Hero({ matches }: { matches: Match[] }) {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => Date.now());

  // Tick local de 1s, solo si hay partidos pendientes.
  useEffect(() => {
    if (matches.length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [matches.length]);

  // Partidos de hoy (en hora argentina, igual que el agrupado del fixture).
  // Incluye finalizados, en vivo y por venir del dia.
  const todayKey = argDateKey(new Date(now));
  const todayMatches = matches.filter((m) => {
    const d = m.scheduledAt?.toDate?.();
    return d ? argDateKey(d) === todayKey : false;
  });

  // Si hoy no hay partidos, mostramos el proximo del fixture (primer no
  // finalizado; matches viene ordenado asc por scheduledAt).
  const nextUpcoming = matches.find((m) => m.status !== 'finished') ?? null;
  const list =
    todayMatches.length > 0 ? todayMatches : nextUpcoming ? [nextUpcoming] : [];
  const headerKey = todayMatches.length > 0 ? 'heroToday' : 'heroNextMatch';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative mb-6 overflow-hidden rounded-2xl border-2 border-oro/40 bg-gradient-to-br from-[#22517f] via-[#16304d] to-carbon p-5 shadow-lg shadow-black/30 sm:p-6"
    >
      {/* Resplandor dorado decorativo. */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-oro/20 blur-3xl" />

      <h1 className="relative font-display text-3xl font-bold sm:text-4xl">
        {t('homeTitle')}
      </h1>

      {list.length > 0 ? (
        <div className="relative mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-oro">
            {t(headerKey)}
          </p>
          <div className="mt-2">
            {list.map((m) => (
              <MatchRow key={m.id} match={m} now={now} />
            ))}
          </div>
        </div>
      ) : (
        <p className="relative mt-2 text-sm text-suave">{t('homeTaglineGuest')}</p>
      )}
    </motion.div>
  );
}
