'use client';

import { LeaderboardTable } from '@/components/LeaderboardTable';
import { useLanguage } from '@/hooks/useLanguage';

export default function RankingPage() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">
        {t('rankingTitle')}
      </h1>
      <p className="mb-6 text-sm text-suave">{t('rankingTagline')}</p>
      <LeaderboardTable limitRows={100} />
    </div>
  );
}
