import { flagImgUrl } from '@/lib/flags';

/**
 * Renderiza la bandera de un equipo como imagen (flagcdn) en lugar del emoji,
 * porque Windows no dibuja los emojis de banderas. Si el equipo todavia no esta
 * definido (sin emoji valido) cae a un placeholder neutro.
 */
export function Flag({
  flag,
  name,
  height = 20,
  className = '',
}: {
  flag?: string | null;
  name?: string | null;
  height?: number;
  className?: string;
}) {
  const url = flagImgUrl(flag, height);
  const width = Math.round((height * 4) / 3); // ratio aprox 4:3 de flagcdn

  if (!url) {
    return (
      <span
        className={`inline-block shrink-0 rounded-sm bg-acero/50 ${className}`}
        style={{ width, height }}
        aria-hidden
      />
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
      className={`shrink-0 rounded-sm object-cover ${className}`}
      style={{ width, height }}
    />
  );
}
