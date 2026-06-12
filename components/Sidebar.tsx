'use client';

import Link from 'next/link';
import { LeaderboardTable } from './LeaderboardTable';

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-20">
        <h2 className="mb-3 font-display text-lg font-bold text-oro">Ranking</h2>
        <LeaderboardTable limitRows={5} />
        <Link
          href="/ranking"
          className="mt-3 block text-center text-sm font-semibold text-suave transition hover:text-oro"
        >
          Ver ranking completo →
        </Link>
      </div>
    </aside>
  );
}
