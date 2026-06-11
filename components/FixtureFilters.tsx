'use client';

export interface FilterOption {
  id: string;
  label: string;
}

export const FIXTURE_FILTERS: FilterOption[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'grupos', label: 'Grupos' },
  { id: 'r32', label: '16avos' },
  { id: 'octavos', label: '8avos' },
  { id: 'cuartos', label: 'Cuartos' },
  { id: 'semis', label: 'Semis' },
  { id: 'final', label: 'Final' },
  { id: 'fecha', label: '📅 Por fecha' },
];

export function FixtureFilters({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
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
          {f.label}
        </button>
      ))}
    </div>
  );
}
