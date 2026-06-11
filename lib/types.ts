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
