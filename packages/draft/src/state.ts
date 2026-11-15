import { buildSteps, DEFAULT_FORMAT, type DraftFormat } from './format.js';
import type { DraftState, Step, Team } from './types.js';

export function newDraft(mode: string, map = '', firstTeam: Team = 'A'): DraftState {
  return { mode, map, firstTeam, actions: [] };
}

export function currentStep(state: DraftState, format: DraftFormat = DEFAULT_FORMAT): Step | null {
  return buildSteps(state.firstTeam, format)[state.actions.length] ?? null;
}

export const usedBrawlers = (state: DraftState): Set<string> =>
  new Set(state.actions.map((a) => a.brawler));

export const picksOf = (state: DraftState, team: Team): string[] =>
  state.actions.filter((a) => a.type === 'pick' && a.team === team).map((a) => a.brawler);

export const bansOf = (state: DraftState, team: Team): string[] =>
  state.actions.filter((a) => a.type === 'ban' && a.team === team).map((a) => a.brawler);

/** Aplica la siguiente acción. Lanza si el draft terminó o el brawler ya se usó. */
export function applyAction(
  state: DraftState,
  brawler: string,
  format: DraftFormat = DEFAULT_FORMAT,
): DraftState {
  const step = currentStep(state, format);
  if (!step) throw new Error('El draft ya terminó');
  if (usedBrawlers(state).has(brawler)) throw new Error(`${brawler} ya fue elegido o baneado`);
  return { ...state, actions: [...state.actions, { ...step, brawler }] };
}

export function undoAction(state: DraftState): DraftState {
  return { ...state, actions: state.actions.slice(0, -1) };
}
