/**
 * Tiempo relativo en castellano para timestamps de comentarios:
 * "ahora", "hace 2 min", "hace 3 h", "hace 1 d".
 */
export function formatRelativeTime(date: Date | null): string {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}
