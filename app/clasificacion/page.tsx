'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { Flag } from '@/components/Flag';

interface Row {
  position: number;
  team: { name: string; code: string; flag: string | null };
  played: number;
  won: number;
  draw: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

interface Group {
  id: string;
  table: Row[];
}

function ClasificacionContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const grupo = searchParams.get('grupo'); // letra del grupo, ej. "A"
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/standings');
      const data = await res.json();
      if (cancelled) return;
      if (!data.ok) {
        setError(true);
        return;
      }
      setGroups(data.groups as Group[]);
    })().catch(() => {
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Si viene ?grupo=A, mostramos solo ese grupo (con chip para limpiar).
  const visible = useMemo(() => {
    if (!groups) return groups;
    if (!grupo) return groups;
    const up = grupo.toUpperCase();
    return groups.filter((g) => g.id.toUpperCase() === up);
  }, [groups, grupo]);

  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">
        {t('standingsTitle')}
      </h1>
      <p className="mb-4 text-sm text-suave">{t('rankingTagline')}</p>

      {grupo && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-oro px-3 py-1.5 text-sm font-semibold text-negro">
            {t('standingsGroup', { group: grupo.toUpperCase() })}
          </span>
          <button
            onClick={() => router.push('/clasificacion')}
            className="rounded-full bg-carbon px-3 py-1.5 text-sm font-semibold text-suave transition hover:text-white"
          >
            {t('clearFilter')}
          </button>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-white/10 bg-carbon p-6 text-suave">
          {t('standingsError')}
        </div>
      ) : visible === null ? (
        <p className="text-suave">{t('standingsLoading')}</p>
      ) : visible.length === 0 ? (
        <p className="text-suave">{t('standingsEmpty')}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className="overflow-hidden rounded-xl border border-white/10 bg-carbon"
            >
              <h2 className="border-b border-white/10 bg-negro px-3 py-2 font-display text-sm font-bold text-oro">
                {t('standingsGroup', { group: g.id })}
              </h2>
              <table className="w-full text-xs">
                <thead className="text-suave">
                  <tr className="[&>th]:px-1 [&>th]:py-1.5 [&>th]:font-semibold">
                    <th className="w-5 text-center">#</th>
                    <th className="text-left">{t('colTeam')}</th>
                    <th className="w-6 text-center">{t('colPlayed')}</th>
                    <th className="hidden w-6 text-center sm:table-cell">
                      {t('colWon')}
                    </th>
                    <th className="hidden w-6 text-center sm:table-cell">
                      {t('colDraw')}
                    </th>
                    <th className="hidden w-6 text-center sm:table-cell">
                      {t('colLost')}
                    </th>
                    <th className="hidden w-7 text-center sm:table-cell">
                      {t('colGoalsFor')}
                    </th>
                    <th className="hidden w-7 text-center sm:table-cell">
                      {t('colGoalsAgainst')}
                    </th>
                    <th className="w-7 text-center">{t('colGoalDiff')}</th>
                    <th className="w-7 text-center font-bold">
                      {t('colPoints')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {g.table.map((r) => {
                    const qualifies = r.position <= 2;
                    return (
                      <tr
                        key={r.team.code + r.position}
                        className={`border-t border-white/5 [&>td]:px-1 [&>td]:py-1.5 ${
                          qualifies ? 'bg-estadio/10' : ''
                        }`}
                      >
                        <td
                          className={`text-center font-display font-bold ${
                            qualifies ? 'text-estadio' : 'text-suave'
                          }`}
                        >
                          {r.position}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Flag
                              flag={r.team.flag}
                              code={r.team.code}
                              name={r.team.name}
                              height={14}
                            />
                            <span className="truncate">{r.team.name}</span>
                          </div>
                        </td>
                        <td className="text-center text-suave">{r.played}</td>
                        <td className="hidden text-center text-suave sm:table-cell">
                          {r.won}
                        </td>
                        <td className="hidden text-center text-suave sm:table-cell">
                          {r.draw}
                        </td>
                        <td className="hidden text-center text-suave sm:table-cell">
                          {r.lost}
                        </td>
                        <td className="hidden text-center text-suave sm:table-cell">
                          {r.gf}
                        </td>
                        <td className="hidden text-center text-suave sm:table-cell">
                          {r.ga}
                        </td>
                        <td className="text-center text-suave">
                          {r.gd > 0 ? `+${r.gd}` : r.gd}
                        </td>
                        <td className="text-center font-display font-bold text-oro">
                          {r.points}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClasificacionPage() {
  const { t } = useLanguage();
  // useSearchParams exige un Suspense boundary para el prerender estatico.
  return (
    <Suspense fallback={<p className="text-suave">{t('standingsLoading')}</p>}>
      <ClasificacionContent />
    </Suspense>
  );
}
