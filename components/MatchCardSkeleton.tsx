'use client';

/**
 * Placeholder de una MatchCard mientras llega el snapshot de Firestore. Imita el
 * layout real (cabecera, dos equipos, columna de marcador) para que no haya
 * salto al cargar. Solo UI: no abre listeners ni lee la base.
 */
export function MatchCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border-2 border-white/15 bg-carbon p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-3 w-32 rounded bg-white/10" />
        <div className="h-4 w-16 rounded bg-white/10" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-[18px] w-7 rounded bg-white/10" />
            <div className="h-4 w-28 rounded bg-white/10" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-[18px] w-7 rounded bg-white/10" />
            <div className="h-4 w-24 rounded bg-white/10" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-9 w-12 rounded bg-white/10" />
          <div className="h-9 w-12 rounded bg-white/10" />
        </div>
      </div>
    </div>
  );
}
