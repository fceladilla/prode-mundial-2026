'use client';

import { useLanguage } from '@/hooks/useLanguage';
import type { TranslationKey } from '@/lib/i18n';

export interface FilterOption {
  id: string;
  labelKey: TranslationKey;
}

export const FIXTURE_FILTERS: FilterOption[] = [
  { id: 'todos', labelKey: 'filterAll' },
  { id: 'grupos', labelKey: 'filterGroups' },
  { id: 'r32', labelKey: 'filterR32' },
  { id: 'octavos', labelKey: 'filterR16' },
  { id: 'cuartos', labelKey: 'filterQF' },
  { id: 'semis', labelKey: 'filterSF' },
  { id: 'final', labelKey: 'filterFinal' },
];

export function FixtureFilters({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
      {FIXTURE_FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
            value === f.id
              ? 'bg-oro text-negro'
              : 'bg-carbon text-suave hover:text-white'
          }`}
        >
          {t(f.labelKey)}
        </button>
      ))}
    </div>
  );
}
