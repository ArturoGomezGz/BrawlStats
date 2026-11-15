import type { Step, Team } from './types.js';

export interface DraftFormat {
  bansPerTeam: number;
  /** Picks por turno de cada equipo, empezando por el primero: 1-2-2-1 en 3 contra 3. */
  pickPattern: number[];
}

export const DEFAULT_FORMAT: DraftFormat = { bansPerTeam: 3, pickPattern: [1, 2, 2, 1] };

const other = (team: Team): Team => (team === 'A' ? 'B' : 'A');

/** Lista de pasos del draft: bans alternados y luego picks en serpiente. */
export function buildSteps(firstTeam: Team, format: DraftFormat = DEFAULT_FORMAT): Step[] {
  const steps: Step[] = [];
  for (let i = 0; i < format.bansPerTeam * 2; i++) {
    steps.push({ type: 'ban', team: i % 2 === 0 ? firstTeam : other(firstTeam) });
  }
  let team = firstTeam;
  for (const count of format.pickPattern) {
    for (let i = 0; i < count; i++) steps.push({ type: 'pick', team });
    team = other(team);
  }
  return steps;
}
