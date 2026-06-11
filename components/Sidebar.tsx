'use client';

import { LeaderboardTable } from './LeaderboardTable';

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-20">
        <h2 className="mb-3 font-display text-lg font-bold text-oro">Ranking</h2>
        <LeaderboardTable limitRows={15} />
      </div>
    </aside>
  );
}
