import { roleOf, ROLE_LABEL } from './data/roles.js';
import { COMMON_COUNTERS, COMMON_SYNERGIES, DEFAULT_TIER, TEMPLATES } from './data/templates.js';
import { DEFAULT_FORMAT, type DraftFormat } from './format.js';
import { methodRules } from './rules.js';
import { currentStep, picksOf, usedBrawlers } from './state.js';
import type { DraftState, ModeTemplate, Role, Step, Suggestion, Team } from './types.js';

export interface SuggestOptions {
  /** Todos los brawlers del juego (de Supercell o la lista de respaldo). */
  roster: string[];
  /** Si se da, solo se sugieren brawlers de esta lista (por ejemplo, los que tiene el jugador). */
  pool?: string[];
  limit?: number;
  format?: DraftFormat;
}

const TIER_POINTS = 10;
const SYNERGY_POINTS = 4;
const COUNTER_POINTS = 5;

export const getTemplate = (mode: string): ModeTemplate | undefined => TEMPLATES[mode];

export const tierOf = (template: ModeTemplate | undefined, map: string, brawler: string): number =>
  (template?.tiers[brawler] ?? DEFAULT_TIER) + (template?.maps[map]?.adjust[brawler] ?? 0);

const synergyList = (template?: ModeTemplate) => [
  ...COMMON_SYNERGIES,
  ...(template?.synergies ?? []),
];
const counterList = (template?: ModeTemplate) => [
  ...COMMON_COUNTERS,
  ...(template?.counters ?? []),
];

function synergyBetween(template: ModeTemplate | undefined, a: string, b: string) {
  let weight = 0;
  let note: string | undefined;
  for (const [x, y, w, n] of synergyList(template)) {
    if ((x === a && y === b) || (x === b && y === a)) {
      weight += w;
      note ??= n;
    }
  }
  return { weight, note };
}

/** Suma los counters de `attacker` contra `victim`. */
function counterWeight(template: ModeTemplate | undefined, attacker: string, victim: string) {
  let weight = 0;
  let note: string | undefined;
  for (const [a, v, w, n] of counterList(template)) {
    if (a === attacker && v === victim) {
      weight += w;
      note ??= n;
    }
  }
  return { weight, note };
}

const other = (team: Team): Team => (team === 'A' ? 'B' : 'A');

function scorePick(
  state: DraftState,
  template: ModeTemplate | undefined,
  brawler: string,
  team: Team,
  available: string[],
  enemyPicksLeft: number,
  totalPicks: number,
): Suggestion {
  const allies = picksOf(state, team);
  const enemies = picksOf(state, other(team));
  const reasons: string[] = [];
  const label = template?.label ?? state.mode;
  const tier = tierOf(template, state.map, brawler);
  let score = tier * TIER_POINTS;
  if (tier >= 8) reasons.push(`Muy fuerte en ${label}`);
  else if (tier <= 4) reasons.push(`Flojo en ${label}`);
  const mapInfo = template?.maps[state.map];
  if (mapInfo?.note && mapInfo.adjust[brawler]) reasons.push(mapInfo.note);

  for (const ally of allies) {
    const { weight, note } = synergyBetween(template, brawler, ally);
    if (weight) {
      score += weight * SYNERGY_POINTS;
      reasons.push(`Sinergia con ${ally}${note ? `: ${note}` : ''}`);
    }
  }

  for (const enemy of enemies) {
    const good = counterWeight(template, brawler, enemy);
    if (good.weight) {
      score += good.weight * COUNTER_POINTS;
      reasons.push(`Counter de ${enemy}${good.note ? `: ${good.note}` : ''}`);
    }
    const bad = counterWeight(template, enemy, brawler);
    if (bad.weight) {
      score -= bad.weight * COUNTER_POINTS;
      reasons.push(`${enemy} le gana`);
    }
  }

  // Riesgo de que el rival lo contrapickee con lo que aún le queda por elegir.
  if (enemyPicksLeft > 0) {
    const threats = available
      .filter((a) => a !== brawler)
      .map((a) => ({ a, weight: counterWeight(template, a, brawler).weight }))
      .filter((c) => c.weight > 0)
      .sort((x, y) => y.weight - x.weight)
      .slice(0, 2);
    const exposure = threats.reduce((sum, c) => sum + c.weight, 0);
    if (exposure) {
      score -= exposure * COUNTER_POINTS * Math.min(enemyPicksLeft, 3) * 0.25;
      reasons.push(`Riesgo: lo contrapickean ${threats.map((c) => c.a).join(' o ')}`);
    }
  }

  const role = roleOf(brawler);
  if (role && template) {
    const allyRoles = allies.map(roleOf).filter((r): r is Role => !!r);
    const need = template.roleNeeds[role] ?? 0;
    if (!allyRoles.includes(role) && need > 0) {
      score += need * 8;
      if (need >= 0.6) reasons.push(`Aporta ${ROLE_LABEL[role]}, que le falta al equipo`);
    } else if (allyRoles.filter((r) => r === role).length >= 2) {
      score -= 6;
      reasons.push(`Tercer ${ROLE_LABEL[role]} en el equipo`);
    }
  }

  const rules = methodRules({
    state,
    brawler,
    allies,
    enemies,
    isFirstPick: allies.length + enemies.length === 0,
    isLastPick: allies.length + enemies.length === totalPicks - 1,
  });
  score += rules.points;
  reasons.push(...rules.reasons);

  return { brawler, score: Math.round(score * 10) / 10, reasons };
}

function scoreBan(
  state: DraftState,
  template: ModeTemplate | undefined,
  brawler: string,
  team: Team,
): Suggestion {
  const allies = picksOf(state, team);
  const enemies = picksOf(state, other(team));
  const reasons: string[] = [];
  const tier = tierOf(template, state.map, brawler);
  let score = tier * TIER_POINTS;
  if (tier >= 8) reasons.push(`Muy fuerte en ${template?.label ?? state.mode}`);

  for (const ally of allies) {
    if (counterWeight(template, brawler, ally).weight) {
      score += counterWeight(template, brawler, ally).weight * COUNTER_POINTS;
      reasons.push(`Counter de tu ${ally}`);
    }
    score -= counterWeight(template, ally, brawler).weight * 2;
  }
  for (const enemy of enemies) {
    const { weight } = synergyBetween(template, brawler, enemy);
    if (weight) {
      score += weight * SYNERGY_POINTS;
      reasons.push(`Combina con ${enemy} del rival`);
    }
  }
  return { brawler, score: Math.round(score * 10) / 10, reasons };
}

/** Sugerencias ordenadas para el paso actual. Vacío si el draft terminó. */
export function suggest(state: DraftState, options: SuggestOptions): Suggestion[] {
  const step = currentStep(state, options.format ?? DEFAULT_FORMAT);
  return step ? suggestFor(state, step, options) : [];
}

/** Sugerencias para un paso cualquiera, sin exigir el orden del draft (modo libre). */
export function suggestFor(state: DraftState, step: Step, options: SuggestOptions): Suggestion[] {
  const format = options.format ?? DEFAULT_FORMAT;
  const template = getTemplate(state.mode);
  const used = usedBrawlers(state);
  const available = options.roster.filter((b) => !used.has(b));
  const pool = options.pool ? new Set(options.pool) : null;
  const candidates =
    step.type === 'pick' && pool ? available.filter((b) => pool.has(b)) : available;

  const picksPerTeam = format.pickPattern.reduce((a, b) => a + b, 0) / 2;
  const enemyPicksLeft = Math.max(0, picksPerTeam - picksOf(state, other(step.team)).length);
  const scored = candidates.map((b) =>
    step.type === 'pick'
      ? scorePick(state, template, b, step.team, available, enemyPicksLeft, picksPerTeam * 2)
      : scoreBan(state, template, b, step.team),
  );
  scored.sort((a, b) => b.score - a.score || a.brawler.localeCompare(b.brawler));
  return scored.slice(0, options.limit ?? 12);
}
