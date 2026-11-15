import type { BattleSummary } from './battle.js';
import type { Player } from './schemas.js';

/** Respuestas de la api propia de Brawl Stats; la web las consume con estos tipos. */

export type PlayerResponse = Player & { tracked: boolean };

export interface BattlelogResponse {
  battles: BattleSummary[];
  /** Victorias / (victorias + derrotas) de las batallas mostradas, o null si no hay ninguna. */
  winRate: number | null;
}

export interface HistoryResponse {
  tracked: boolean;
  totalBattles: number;
  trophies: { takenAt: string; trophies: number }[];
  daily: { date: string; wins: number; losses: number }[];
}

export interface ApiErrorBody {
  error:
    | 'invalid_tag'
    | 'not_found'
    | 'rate_limited'
    | 'unauthorized'
    | 'unavailable'
    | 'bad_response'
    | 'internal';
  message: string;
}
