'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromCache,
  onSnapshot,
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
import { StandingsTable, useStandings } from '@/components/StandingsTable';

// Tabla del grupo de un pais, con su fila resaltada. Usa el hook solo cuando se
// monta (es decir, solo cuando hay filtro por equipo), asi no agrega un fetch a
// /api/standings en la carga normal del home.
function TeamGroupStandings({
  teamCode,
  group,
}: {
  teamCode: string;
  group: string;
}) {
  const { groups } = useStandings();
  const g = groups?.find((x) => x.id.toUpperCase() === group.toUpperCase());
  if (!g) return null;
  return (
    <div className="mb-6 lg:max-w-xl">
      <StandingsTable group={g} highlightCode={teamCode} />
    </div>
  );
}

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

type SectionKind = 'today' | 'past' | 'future' | 'stage';
interface Section {
  key: string;
  label: string;
  list: Match[];
  kind: SectionKind;
}

function FixtureContent() {
  const { user } = useAuth();
  const { lang, t, tStage } = useLanguage();
  const locale = LOCALE[lang];
  const router = useRouter();
  const searchParams = useSearchParams();
  const equipo = searchParams.get('equipo'); // codigo FIFA, ej. "ARG"
  const fecha = searchParams.get('fecha'); // dia ART, ej. "2026-06-11"
  // Partidos indexados por id. Se alimenta de dos fuentes (ver effects):
  // un listener en vivo SOLO sobre los no finalizados y una lectura unica
  // (cache-first) de los finalizados, que no cambian. Asi no se relee todo el
  // fixture en cada carga/expiracion de token: el peor caso queda acotado al
  // set chico de no finalizados.
  const [matchesById, setMatchesById] = useState<Record<string, Match>>({});
  const matches = useMemo(
    () =>
      Object.values(matchesById).sort(
        (a, b) => a.scheduledAt.toMillis() - b.scheduledAt.toMillis()
      ),
    [matchesById]
  );
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('todos');
  // Plegado por seccion. Guardamos solo los toggles explicitos del usuario; el
  // default se deriva: una seccion arranca plegada si TODOS sus partidos ya se
  // jugaron (finished), para llegar mas rapido a los dias por venir.
  const [collapsedOverrides, setCollapsedOverrides] = useState<
    Record<string, boolean>
  >({});

  // Finalizados: lectura UNICA, primero desde el cache (gratis). Como un partido
  // finalizado no cambia nunca, no necesita listener en vivo. Solo la primera vez
  // (cache frio) se leen del server. Los que terminen despues entran por el
  // listener de abajo, asi que el conjunto siempre queda completo.
  useEffect(() => {
    const db = getDbClient();
    const fq = query(
      collection(db, 'matches'),
      where('status', '==', 'finished')
    );
    let cancelled = false;
    (async () => {
      let snap;
      try {
        snap = await getDocsFromCache(fq);
        if (snap.empty) throw new Error('cache vacio');
      } catch {
        snap = await getDocs(fq); // frio (primera visita): server, una sola vez
      }
      if (cancelled) return;
      const add: Record<string, Match> = {};
      snap.forEach((d) => {
        add[d.id] = { id: d.id, ...(d.data() as Omit<Match, 'id'>) };
      });
      // `prev` (lo no finalizado / ya mergeado) gana ante un eventual solapado.
      setMatchesById((prev) => ({ ...add, ...prev }));
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // No finalizados: en vivo. Es el unico set que cambia (y se achica con el
  // torneo), asi que un re-cobro por token expirado cuesta solo este puñado, no
  // los 104. Cuando un partido termina sale de esta query (evento 'removed') y
  // traemos su version final con un getDoc puntual (1 lectura).
  useEffect(() => {
    const db = getDbClient();
    const lq = query(
      collection(db, 'matches'),
      where('status', '!=', 'finished')
    );
    return onSnapshot(
      lq,
      (snap) => {
        setMatchesById((prev) => {
          const next = { ...prev };
          for (const ch of snap.docChanges()) {
            const id = ch.doc.id;
            if (ch.type === 'removed') {
              // Dejo de ser "no finalizado" => termino: traigo el doc final.
              getDoc(doc(db, 'matches', id))
                .then((d) => {
                  if (d.exists())
                    setMatchesById((p) => ({
                      ...p,
                      [id]: { id: d.id, ...(d.data() as Omit<Match, 'id'>) },
                    }));
                })
                .catch(() => {});
            } else {
              next[id] = { id, ...(ch.doc.data() as Omit<Match, 'id'>) };
            }
          }
          return next;
        });
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

  // Grupo del pais buscado (su partido de fase de grupos), para mostrar su tabla.
  const equipoGroup = useMemo(() => {
    if (!equipo) return null;
    const m = matches.find(
      (x) =>
        x.group != null &&
        (x.homeTeam.code === equipo || x.awayTeam.code === equipo)
    );
    return m?.group ?? null;
  }, [equipo, matches]);

  // Filtrar + agrupar segun la vista elegida.
  //  - Vistas por fecha (todos / busqueda): agrupamos por dia y reordenamos para
  //    que HOY quede primero (foco), luego los dias pasados de mas reciente a mas
  //    viejo (para chequear resultados de ayer rapido) y al final los proximos.
  //  - Vistas por fase (grupos, octavos, ...): agrupamos por fase y ordenamos
  //    alfabeticamente (Grupo A, B, C, ...).
  const sections = useMemo<Section[]>(() => {
    const byDate = Boolean(equipo || fecha || view === 'todos');
    const todayKey = argDateKey(new Date());
    const map = new Map<string, { label: string; list: Match[] }>();
    for (const m of matches) {
      if (equipo) {
        if (m.homeTeam.code !== equipo && m.awayTeam.code !== equipo) continue;
      } else if (fecha) {
        if (argDateKey(m.scheduledAt.toDate()) !== fecha) continue;
      } else if (!passesFilter(m, view)) {
        continue;
      }
      const d = m.scheduledAt.toDate();
      const key = byDate ? argDateKey(d) : m.stage;
      const label = byDate ? argDateLabel(d, locale) : tStage(m.stage);
      const entry = map.get(key) ?? { label, list: [] };
      entry.list.push(m);
      map.set(key, entry);
    }

    const entries = Array.from(map.entries()).map(([key, v]) => ({
      key,
      label: v.label,
      list: v.list,
    }));

    if (!byDate) {
      // Fases: orden alfabetico estable por etiqueta traducida.
      entries.sort((a, b) => a.label.localeCompare(b.label, locale));
      return entries.map((e) => ({ ...e, kind: 'stage' as const }));
    }

    // Fechas: hoy primero, pasados desc (reciente -> viejo), futuros asc.
    const rank = (k: string) => (k === todayKey ? 0 : k < todayKey ? 1 : 2);
    entries.sort((a, b) => {
      const ra = rank(a.key);
      const rb = rank(b.key);
      if (ra !== rb) return ra - rb;
      return ra === 1 ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key);
    });
    return entries.map((e) => ({
      ...e,
      kind:
        e.key === todayKey ? ('today' as const)
        : e.key < todayKey ? ('past' as const)
        : ('future' as const),
    }));
  }, [matches, view, equipo, fecha, locale, tStage]);

  // Seccion con foco al entrar (expandida por defecto): hoy si hay partidos hoy;
  // si no, el proximo dia por venir; y si todo es pasado, el mas reciente.
  const focusKey = useMemo(() => {
    if (sections.length === 0 || sections[0].kind === 'stage') return null;
    const today = sections.find((s) => s.kind === 'today');
    if (today) return today.key;
    const future = sections.filter((s) => s.kind === 'future');
    if (future.length) return future[0].key; // futuros en asc -> el primero es el proximo por venir
    return sections[0].key; // todo pasado: el mas reciente quedo primero
  }, [sections]);

  // Clave de "ayer" (hora ARG) para etiquetar la ultima fecha jugada.
  const yesterdayKey = argDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  return (
    <div>
      {/* La card con la cuenta regresiva no se muestra durante una busqueda. */}
      {!searchFilterLabel && <Hero matches={matches} />}
      <p className="mb-4 text-sm text-suave">
        {user ? t('homeTaglineUser') : t('homeTaglineGuest')}
      </p>

      {!loading && matches.length > 0 && searchFilterLabel ? (
        <>
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
          {/* Al buscar por pais, su tabla de grupo (con el pais resaltado). */}
          {equipo && equipoGroup && (
            <TeamGroupStandings teamCode={equipo} group={equipoGroup} />
          )}
        </>
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
          {sections.map((s, gi) => {
            const allFinished =
              s.list.length > 0 && s.list.every((m) => m.status === 'finished');
            // Por defecto: en vistas por fecha solo se abre la seccion con foco
            // (hoy); en vistas por fase se pliega si ya se jugo entera.
            const defaultCollapsed =
              s.kind === 'stage' ? allFinished : s.key !== focusKey;
            const collapsed = collapsedOverrides[s.key] ?? defaultCollapsed;
            const isToday = s.kind === 'today';
            const isYesterday = s.kind === 'past' && s.key === yesterdayKey;
            // Separador antes del primer dia por venir.
            const showUpcomingDivider =
              s.kind === 'future' &&
              (gi === 0 || sections[gi - 1].kind !== 'future');
            return (
              <section key={s.key}>
                {showUpcomingDivider && (
                  <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-suave">
                    <span className="h-px flex-1 bg-white/10" />
                    {t('upcomingMatches')}
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                )}
                <button
                  onClick={() =>
                    setCollapsedOverrides((p) => ({ ...p, [s.key]: !collapsed }))
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
                  {isToday && (
                    <span className="flex items-center gap-1 rounded-full bg-oro px-2 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wide text-negro">
                      <span className="h-1.5 w-1.5 rounded-full bg-negro" />
                      {t('labelToday')}
                    </span>
                  )}
                  {isYesterday && (
                    <span className="rounded-full bg-carbon px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-suave">
                      {t('labelYesterday')}
                    </span>
                  )}
                  <span>{s.label}</span>
                  <span className="font-sans text-xs font-normal text-suave">
                    {s.list.length}
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
                        {s.list.map((m, i) => (
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
