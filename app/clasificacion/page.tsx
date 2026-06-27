'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { StandingsTable, useStandings } from '@/components/StandingsTable';

function ClasificacionContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const grupo = searchParams.get('grupo'); // letra del grupo, ej. "A"
  const { groups, error } = useStandings();

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
            <StandingsTable key={g.id} group={g} index={i} />
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
