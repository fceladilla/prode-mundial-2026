import { translate, type Lang } from '@/lib/i18n';

/**
 * Tiempo relativo en el idioma elegido para timestamps de comentarios:
 * "ahora", "hace 2 min" / "ara", "fa 2 min" / "now", "2 min ago".
 */
export function formatRelativeTime(date: Date | null, lang: Lang = 'es'): string {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return translate(lang, 'now');
  if (diff < 3600)
    return translate(lang, 'minutesAgo', { n: Math.floor(diff / 60) });
  if (diff < 86400)
    return translate(lang, 'hoursAgo', { n: Math.floor(diff / 3600) });
  return translate(lang, 'daysAgo', { n: Math.floor(diff / 86400) });
}
