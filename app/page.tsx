'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { getDbClient } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
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

function dateLabel(m: Match): string {
  const l = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(m.scheduledAt.toDate());
  return l.charAt(0).toUpperCase() + l.slice(1);
}

export default function FixturePage() {
  const { user } = useAuth();
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

  // Filtrar + agrupar segun la vista elegida (manteniendo el orden cronologico).
  const sections = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      if (!passesFilter(m, view)) continue;
      const label = view === 'todos' ? dateLabel(m) : m.stage;
      const arr = map.get(label) ?? [];
      arr.push(m);
      map.set(label, arr);
    }
    return Array.from(map.entries());
  }, [matches, view]);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Fixture Mundial 2026</h1>
      <p className="mb-4 text-sm text-suave">
        {user
          ? 'Carga tu pronostico antes de que empiece cada partido.'
          : 'Ingresa con Google para pronosticar y sumar puntos.'}
      </p>

      {!loading && matches.length > 0 && (
        <FixtureFilters value={view} onChange={setView} />
      )}

      {loading ? (
        <p className="text-suave">Cargando partidos...</p>
      ) : matches.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-carbon p-6 text-suave">
          Todavia no hay partidos cargados. Ejecuta{' '}
          <code className="text-oro">npm run seed</code>.
        </div>
      ) : sections.length === 0 ? (
        <p className="text-suave">No hay partidos en esta vista.</p>
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
