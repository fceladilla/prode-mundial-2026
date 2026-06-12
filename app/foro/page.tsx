'use client';

import { CommentSection } from '@/components/CommentSection';
import { useLanguage } from '@/hooks/useLanguage';

export default function ForoPage() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="mb-1 font-display text-3xl font-bold">
        {t('forumTitle')}
      </h1>
      <p className="mb-6 text-sm text-suave">{t('forumTagline')}</p>
      <CommentSection />
    </div>
  );
}
