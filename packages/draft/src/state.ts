import { buildSteps, DEFAULT_FORMAT, type DraftFormat } from './format.js';
import type { DraftAction, DraftState, Step, Team } from './types.js';

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

/** Máximo de picks por equipo y de bans distintos en la partida (un ban repetido por ambos equipos cuenta una vez). */
export const MAX_PICKS_PER_TEAM = DEFAULT_FORMAT.pickPattern.reduce((a, b) => a + b, 0) / 2;
export const MAX_BANS = DEFAULT_FORMAT.bansPerTeam * 2;

/** Bans de la partida, sin importar qué equipo los hizo. */
export const bannedBrawlers = (state: DraftState): string[] =>
  state.actions.filter((a) => a.type === 'ban').map((a) => a.brawler);

/** Agrega un ban o pick sin exigir orden. Lanza si el brawler ya se usó o no queda lugar. */
export function addFree(state: DraftState, action: DraftAction): DraftState {
  if (usedBrawlers(state).has(action.brawler)) {
    throw new Error(`${action.brawler} ya fue elegido o baneado`);
  }
  const full =
    action.type === 'ban'
      ? bannedBrawlers(state).length >= MAX_BANS
      : picksOf(state, action.team).length >= MAX_PICKS_PER_TEAM;
  if (full) throw new Error('Ya no hay lugar');
  return { ...state, actions: [...state.actions, action] };
}

/** Quita un brawler del draft, sin importar cuándo se agregó. */
export function removeBrawler(state: DraftState, brawler: string): DraftState {
  return { ...state, actions: state.actions.filter((a) => a.brawler !== brawler) };
}
