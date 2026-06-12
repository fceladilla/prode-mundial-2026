const TZ = 'America/Argentina/Buenos_Aires';

/** Clave estable de dia en hora argentina, ej. "2026-06-11". */
export function argDateKey(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Etiqueta legible del dia en hora argentina, ej. "Jueves 11 de junio". */
export function argDateLabel(d: Date): string {
  const l = new Intl.DateTimeFormat('es-AR', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
  return l.charAt(0).toUpperCase() + l.slice(1);
}
