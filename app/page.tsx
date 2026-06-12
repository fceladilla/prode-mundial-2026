'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
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
import { FixtureFilters } from '@/components/FixtureFilters';

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
      <h1 className="mb-1 font-display text-3xl font-bold">{t('homeTitle')}</h1>
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
        <p className="text-suave">{t('loadingMatches')}</p>
      ) : matches.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-carbon p-6 text-suave">
          {t('noMatchesSeeded')} <code className="text-oro">npm run seed</code>.
        </div>
      ) : sections.length === 0 ? (
        <p className="text-suave">{t('noMatchesInView')}</p>
      ) : (
        <div className="space-y-8">
          {sections.map(([label, list], gi) => (
            <section key={label}>
              <h2 className="mb-3 font-display text-xl font-bold text-oro">
                {label}
              </h2>
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
            </section>
          ))}
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
