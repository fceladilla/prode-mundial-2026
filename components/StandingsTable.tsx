'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/hooks/useLanguage';
import { Flag } from './Flag';

export interface StandingsRow {
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

export interface StandingsGroup {
  id: string;
  table: StandingsRow[];
}

/**
 * Trae la tabla de posiciones de /api/standings una vez. El endpoint ya cachea
 * 30 min upstream, asi que no hace falta cache extra del lado del cliente.
 * `highlightCode`/`highlightGroup` son opcionales para resaltar un equipo/grupo.
 */
export function useStandings() {
  const [groups, setGroups] = useState<StandingsGroup[] | null>(null);
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
      setGroups(data.groups as StandingsGroup[]);
    })().catch(() => {
      if (!cancelled) setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { groups, error };
}

/**
 * Tarjeta con la tabla de un grupo. `highlightCode` resalta la fila de un equipo
 * (para la vista del home filtrada por pais).
 */
export function StandingsTable({
  group,
  index = 0,
  highlightCode,
}: {
  group: StandingsGroup;
  index?: number;
  highlightCode?: string | null;
}) {
  const { t } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="overflow-hidden rounded-xl border border-white/10 bg-carbon"
    >
      <h2 className="border-b border-white/10 bg-negro px-3 py-2 font-display text-sm font-bold text-oro">
        {t('standingsGroup', { group: group.id })}
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
            <th className="w-7 text-center font-bold">{t('colPoints')}</th>
          </tr>
        </thead>
        <tbody>
          {group.table.map((r) => {
            const qualifies = r.position <= 2;
            const isHighlight =
              highlightCode != null && r.team.code === highlightCode;
            return (
              <tr
                key={r.team.code + r.position}
                className={`border-t border-white/5 [&>td]:px-1 [&>td]:py-1.5 ${
                  isHighlight
                    ? 'bg-oro/15 ring-1 ring-inset ring-oro/40'
                    : qualifies
                      ? 'bg-estadio/10'
                      : ''
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
                    <span
                      className={`truncate ${isHighlight ? 'font-bold text-oro' : ''}`}
                    >
                      {r.team.name}
                    </span>
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
  );
}
