'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { LOCALE } from '@/lib/i18n';
import { argDateKey, argDateLabel } from '@/lib/dates';
import type { Match, Prediction } from '@/lib/types';
import { MatchCard } from '@/components/MatchCard';
import { MatchCardSkeleton } from '@/components/MatchCardSkeleton';
import { FixtureFilters } from '@/components/FixtureFilters';
import { Hero } from '@/components/Hero';

function passesFilter(m: Match, view: string): boolean {
  switch (view) {
    case 'grupos':
      return m.group != null;
    case 'r32':
      return m.stage === 'Ronda de 32';
    case 'octavos':
      return m.stage === 'Octavos de Final';
    case 'cuartos':
      return m.stage === 'Cuartos de Final';
    case 'semis':
      return m.stage === 'Semifinal';
    case 'final':
      return m.stage === 'Final' || m.stage === 'Tercer Puesto';
    default:
      return true; // 'todos' muestra todos
  }
}

function FixtureContent() {
  const { user } = useAuth();
  const { lang, t, tStage } = useLanguage();
  const locale = LOCALE[lang];
  const router = useRouter();
  const searchParams = useSearchParams();
  const equipo = searchParams.get('equipo'); // codigo FIFA, ej. "ARG"
  const fecha = searchParams.get('fecha'); // dia ART, ej. "2026-06-11"
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('todos');
  // Plegado por seccion. Guardamos solo los toggles explicitos del usuario; el
  // default se deriva: una seccion arranca plegada si TODOS sus partidos ya se
  // jugaron (finished), para llegar mas rapido a los dias por venir.
  const [collapsedOverrides, setCollapsedOverrides] = useState<
    Record<string, boolean>
  >({});

  // Partidos en tiempo real, ordenados por fecha.
  useEffect(() => {
    const q = query(
      collection(getDbClient(), 'matches'),
      orderBy('scheduledAt', 'asc')
    );
    return onSnapshot(
      q,
      (snap) => {
        setMatches(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, []);

  // Pronosticos del usuario logueado.
  useEffect(() => {
    if (!user) {
      setPredictions({});
      return;
    }
    const q = query(
      collection(getDbClient(), 'predictions'),
      where('userId', '==', user.uid)
    );
    return onSnapshot(q, (snap) => {
      const map: Record<string, Prediction> = {};
      snap.docs.forEach((d) => {
        const p = d.data() as Prediction;
        map[p.matchId] = p;
      });
      setPredictions(map);
    });
  }, [user]);

  // Filtro activo desde el buscador (?equipo= o ?fecha=), por encima de las pestanas.
  const searchFilterLabel = useMemo(() => {
    if (equipo) {
      const m = matches.find(
        (x) => x.homeTeam.code === equipo || x.awayTeam.code === equipo
      );
      const name = m
        ? m.homeTeam.code === equipo
          ? m.homeTeam.name
          : m.awayTeam.name
        : equipo;
      return t('matchesOfTeam', { name });
    }
    if (fecha) {
      const m = matches.find((x) => argDateKey(x.scheduledAt.toDate()) === fecha);
      return m
        ? argDateLabel(m.scheduledAt.toDate(), locale)
        : t('matchesOfDate', { date: fecha });
    }
    return null;
  }, [equipo, fecha, matches, t, locale]);

  // Filtrar + agrupar segun la vista elegida (manteniendo el orden cronologico).
  const sections = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      if (equipo) {
        if (m.homeTeam.code !== equipo && m.awayTeam.code !== equipo) continue;
      } else if (fecha) {
        if (argDateKey(m.scheduledAt.toDate()) !== fecha) continue;
      } else if (!passesFilter(m, view)) {
        continue;
      }
      const useDateLabel = equipo || fecha || view === 'todos';
      const label = useDateLabel
        ? argDateLabel(m.scheduledAt.toDate(), locale)
        : tStage(m.stage);
      const arr = map.get(label) ?? [];
      arr.push(m);
      map.set(label, arr);
    }
    return Array.from(map.entries());
  }, [matches, view, equipo, fecha, locale, tStage]);

  return (
    <div>
      <Hero matches={matches} />
      <p className="mb-4 text-sm text-suave">
        {user ? t('homeTaglineUser') : t('homeTaglineGuest')}
      </p>

      {!loading && matches.length > 0 && searchFilterLabel ? (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-oro px-3 py-1.5 text-sm font-semibold text-negro">
            {searchFilterLabel}
          </span>
          <button
            onClick={() => router.push('/')}
            className="rounded-full bg-carbon px-3 py-1.5 text-sm font-semibold text-suave transition hover:text-white"
          >
            {t('clearFilter')}
          </button>
        </div>
      ) : (
        !loading &&
        matches.length > 0 && <FixtureFilters value={view} onChange={setView} />
      )}

      {loading ? (
        <div className="grid gap-3" aria-busy="true" aria-label={t('loadingMatches')}>
          {Array.from({ length: 5 }).map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-carbon p-6 text-suave">
          {t('noMatchesSeeded')} <code className="text-oro">npm run seed</code>.
        </div>
      ) : sections.length === 0 ? (
        <p className="text-suave">{t('noMatchesInView')}</p>
      ) : (
        <div className="space-y-8">
          {sections.map(([label, list], gi) => {
            const allFinished =
              list.length > 0 && list.every((m) => m.status === 'finished');
            const collapsed = collapsedOverrides[label] ?? allFinished;
            return (
              <section key={label}>
                <button
                  onClick={() =>
                    setCollapsedOverrides((p) => ({ ...p, [label]: !collapsed }))
                  }
                  aria-expanded={!collapsed}
                  className="mb-3 flex w-full items-center gap-2 text-left font-display text-xl font-bold text-oro"
                >
                  <motion.span
                    animate={{ rotate: collapsed ? -90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="inline-block text-sm text-suave"
                  >
                    ▾
                  </motion.span>
                  <span>{label}</span>
                  <span className="font-sans text-xs font-normal text-suave">
                    {list.length}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="grid gap-3">
                        {list.map((m, i) => (
                          <MatchCard
                            key={m.id}
                            match={m}
                            prediction={predictions[m.id]}
                            index={gi === 0 ? i : 0}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FixturePage() {
  const { t } = useLanguage();
  // useSearchParams exige un Suspense boundary para el prerender estatico.
  return (
    <Suspense fallback={<p className="text-suave">{t('loadingMatches')}</p>}>
      <FixtureContent />
    </Suspense>
  );
}
