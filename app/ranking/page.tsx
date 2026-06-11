'use client';

import { LeaderboardTable } from '@/components/LeaderboardTable';

export default function RankingPage() {
  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">Ranking general</h1>
      <p className="mb-6 text-sm text-suave">
        Posiciones en tiempo real. Sumas 2 puntos por acertar el resultado y 5
        por el marcador exacto.
      </p>
      <LeaderboardTable limitRows={100} />
    </div>
  );
}
