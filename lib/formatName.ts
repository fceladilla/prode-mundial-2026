/**
 * Toma el displayName de Google ("Franco Celadilla") y devuelve
 * la version abreviada ("Franco C.") para el leaderboard.
 *
 * Casos contemplados:
 *   "Franco Celadilla"       -> "Franco C."
 *   "Franco"                 -> "Franco"        (sin apellido, devuelve tal cual)
 *   "Maria Jose Lopez Ruiz"  -> "Maria Jose L." (ultimo token como apellido)
 *   null / undefined / ""    -> "Anonimo"
 *
 * Es puramente de presentacion: el nombre completo se sigue guardando
 * en Firestore tal cual.
 */
export function formatDisplayName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return 'Anónimo';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');
  return `${firstName} ${lastName[0].toUpperCase()}.`;
}
