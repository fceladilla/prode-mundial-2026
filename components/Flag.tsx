'use client';

import { useEffect, useState } from 'react';
import { flagImgUrl } from '@/lib/flags';

/**
 * Renderiza la bandera de un equipo como imagen (flagcdn) en lugar del emoji,
 * porque Windows no dibuja los emojis de banderas. Si no hay bandera o la
 * imagen falla al cargar, cae a la abreviacion del pais (ej. "MEX").
 */
export function Flag({
  flag,
  code,
  name,
  height = 20,
  className = '',
}: {
  flag?: string | null;
  code?: string | null;
  name?: string | null;
  height?: number;
  className?: string;
}) {
  const url = flagImgUrl(flag, height);
  const [failed, setFailed] = useState(false);
  const width = Math.round((height * 4) / 3); // ratio aprox 4:3 de flagcdn

  // Si cambia la bandera, reintentamos cargar la imagen.
  useEffect(() => setFailed(false), [url]);

  if (!url || failed) {
    const abbr = (code ?? name ?? '?').slice(0, 3).toUpperCase();
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-sm bg-acero font-display text-[10px] font-bold leading-none text-white ${className}`}
        style={{ width, height }}
        title={name ?? undefined}
      >
        {abbr}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name ? `Bandera de ${name}` : 'bandera'}
      width={width}
      height={height}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-sm object-cover ${className}`}
      style={{ width, height }}
    />
  );
}
