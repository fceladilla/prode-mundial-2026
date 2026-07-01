import type { Timestamp } from 'firebase/firestore';

export type MatchStatus = 'upcoming' | 'live' | 'finished';

export interface Team {
  name: string;
  code: string;
  flag?: string | null;
}

export interface Venue {
  name: string;
  city: string;
  country: string;
}

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
}

/**
 * Detalle de un cruce de eliminacion que NO se definio en los 90'. El puntaje
 * SIEMPRE se calcula con `result` (los 90'); esto es solo para mostrar como
 * termino realmente el partido (prorroga / penales) y quien avanzo.
 */
export interface ResultDetail {
  duration: 'EXTRA_TIME' | 'PENALTY_SHOOTOUT';
  // Marcador tras la prorroga, antes de los penales (en un partido definido por
  // penales suele ser el mismo que los 90').
  fullTime: MatchResult;
  // Tanda de penales, si la hubo.
  penalties: MatchResult | null;
  // Quien avanzo.
  winner: 'home' | 'away';
}

export interface Match {
  id: string;
  matchNumber: number;
  stage: string;
  group?: string | null;
  homeTeam: Team;
  awayTeam: Team;
  venue: Venue;
  scheduledAt: Timestamp;
  scheduledAtARG: string;
  scheduledAtESP: string;
  status: MatchStatus;
  result: MatchResult | null;
  // Solo en cruces definidos por prorroga/penales (ver ResultDetail). El
  // puntaje se calcula con `result` (90'); esto es para mostrar como termino.
  resultDetail?: ResultDetail | null;
  // Resultado parcial mientras el partido esta "live" (lo refresca el sync en
  // cada corrida). Separado de `result` a proposito: la logica de puntaje NUNCA
  // lo lee, asi no hay riesgo de asignar puntos sobre un marcador en juego.
  liveScore?: MatchResult | null;
}

export interface Prediction {
  userId: string;
  matchId: string;
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  pointsEarned: number;
  evaluated: boolean;
}

export interface LeaderboardUser {
  id: string;
  displayName: string;
  photoURL: string | null;
  totalPoints: number;
  exactResults: number;
  correctResults: number;
}
