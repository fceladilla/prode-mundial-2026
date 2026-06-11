/**
 * Formatea un kickoff (en ms UTC) a la hora LOCAL del navegador que lo mira,
 * con el mismo estilo que las horas precomputadas: "16:00 (11 jun)".
 *
 * Al no pasar `timeZone`, Intl usa la zona horaria del runtime: en el cliente,
 * la del navegador del usuario. Debe llamarse despues del montaje (en un
 * effect) para no provocar un mismatch de hidratacion con el render del server.
 */
export function formatLocalKickoff(ms: number): string {
  const date = new Date(ms);
  const time = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  const day = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
  })
    .format(date)
    .replace('.', '');

  // Sigla de la zona del usuario (ej. "GMT-3", "CEST"). La sacamos con
  // formatToParts porque es la unica forma fiable de aislar ese pedazo.
  const tz = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    timeZoneName: 'short',
  })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value;

  return tz ? `${time} ${tz} (${day})` : `${time} (${day})`;
}
