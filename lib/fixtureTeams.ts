/**
 * Mapa de equipos derivado del fixture oficial (scripts/fixture_mundial2026.json),
 * indexado por codigo FIFA (el mismo `tla` que devuelve football-data.org). Lo
 * usan el sync (para completar los cruces de eliminacion con nuestros nombres en
 * espanol + emoji de bandera) y la ruta de standings (para mostrar la tabla con
 * el mismo estilo de banderas que el resto de la app).
 *
 * Se construye una sola vez al importar el modulo. No hace lecturas de Firestore.
 */
import fixture from '@/scripts/fixture_mundial2026.json';

export interface FixtureTeam {
  name: string;
  code: string;
  flag: string | null;
}

interface RawFixtureMatch {
  group?: string | null;
  homeTeam: { name: string; code: string; flag?: string | null };
  awayTeam: { name: string; code: string; flag?: string | null };
}

const byCode = new Map<string, FixtureTeam>();
for (const m of fixture as RawFixtureMatch[]) {
  // Solo los partidos de grupos tienen equipos reales; los de eliminacion son
  // placeholders ("TBD"). Tomamos de ahi el catalogo de las 48 selecciones.
  if (!m.group) continue;
  for (const t of [m.homeTeam, m.awayTeam]) {
    if (t.code && t.code !== 'TBD' && !byCode.has(t.code)) {
      byCode.set(t.code, { name: t.name, code: t.code, flag: t.flag ?? null });
    }
  }
}

export const teamByCode: ReadonlyMap<string, FixtureTeam> = byCode;

/**
 * Devuelve nuestro equipo por codigo FIFA. Si no esta en el catalogo (no deberia
 * pasar con selecciones del Mundial), cae a los datos provistos.
 */
export function resolveTeam(
  code: string | null | undefined,
  fallbackName?: string | null
): FixtureTeam {
  const found = code ? byCode.get(code) : undefined;
  if (found) return found;
  return { name: fallbackName ?? code ?? '?', code: code ?? 'TBD', flag: null };
}
