/**
 * GET /api/standings — tabla de posiciones de cada grupo (football-data.org).
 *
 * Publico (como el ranking): no exige auth. La respuesta se cachea 30 min y la
 * llamada upstream tambien (`next: { revalidate }`), asi el endpoint de la API
 * se golpea como mucho cada 30 min sin importar cuanto trafico haya. Las
 * posiciones de grupo cambian lento, asi que esa frescura sobra.
 *
 * Cada fila se enriquece con NUESTRO equipo (nombre en espanol + emoji de
 * bandera) buscado por codigo FIFA, para que la tabla se vea igual que el resto
 * de la app. Si un equipo no esta en el catalogo, cae al nombre de la API.
 *
 * Env necesaria: FOOTBALL_DATA_API_KEY.
 */
import { NextResponse } from 'next/server';
import { resolveTeam } from '@/lib/fixtureTeams';

export const runtime = 'nodejs';
export const revalidate = 1800; // 30 min

const API_URL = 'https://api.football-data.org/v4/competitions/WC/standings';

interface ApiRow {
  position: number;
  team: { name?: string | null; tla?: string | null };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface ApiStanding {
  type: string; // TOTAL | HOME | AWAY
  group?: string | null; // "GROUP_A" ...
  table: ApiRow[];
}

export async function GET() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Falta FOOTBALL_DATA_API_KEY' },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(API_URL, {
      headers: { 'X-Auth-Token': apiKey },
      next: { revalidate },
    });
    if (!res.ok) {
      throw new Error(`football-data.org ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { standings?: ApiStanding[] };

    const groups = (data.standings ?? [])
      .filter((s) => s.type === 'TOTAL' && s.group)
      .map((s) => ({
        // La API devuelve el grupo como "Group A" (a veces "GROUP_A"): tomamos
        // el ultimo token -> "A".
        id: (s.group as string).trim().split(/[\s_]+/).pop() ?? s.group,
        table: s.table.map((r) => {
          const team = resolveTeam(r.team.tla, r.team.name);
          return {
            position: r.position,
            team: { name: team.name, code: team.code, flag: team.flag },
            played: r.playedGames,
            won: r.won,
            draw: r.draw,
            lost: r.lost,
            gf: r.goalsFor,
            ga: r.goalsAgainst,
            gd: r.goalDifference,
            points: r.points,
          };
        }),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return NextResponse.json({ ok: true, groups });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
