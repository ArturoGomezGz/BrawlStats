import { getDraftData } from './data/store.js';
import type { BrawlerTag, DraftClass, DraftState } from './types.js';

/** Puntos por cada paso de ventaja en el triángulo de clases. */
export const TRIANGLE_POINTS = 5;
/** Puntos por unidad de afinidad con el mapa. */
export const MAP_POINTS = 3;
const MAP_CAP = 6;
/** Las necesidades del equipo pesan más cuando eres el último pick: ya ves todo el draft. */
const LAST_PICK_FACTOR = 1.5;

/** Quién le gana a quién entre clases, según el video. */
const BEATS: [DraftClass, DraftClass][] = [
  ['tank', 'control'],
  ['assassin', 'control'],
  ['antitank', 'tank'],
  ['antiassassin', 'assassin'],
  ['control', 'antitank'],
];

const beats = (a: DraftClass, b: DraftClass) => BEATS.some(([x, y]) => x === a && y === b);

export const classesOf = (brawler: string): DraftClass[] =>
  getDraftData().brawlers[brawler]?.classes ?? [];
export const tagsOf = (brawler: string): BrawlerTag[] =>
  getDraftData().brawlers[brawler]?.tags ?? [];

export const CLASS_LABEL: Record<DraftClass, string> = {
  control: 'control',
  tank: 'tanque',
  assassin: 'asesino',
  antitank: 'antitanque',
  antiassassin: 'antiasesino',
  support: 'apoyo',
  sniper: 'francotirador',
  thrower: 'lanzador',
};

export interface RuleContext {
  state: DraftState;
  brawler: string;
  allies: string[];
  enemies: string[];
  /** Ningún equipo ha elegido todavía. */
  isFirstPick: boolean;
  /** Es el último pick de toda la partida. */
  isLastPick: boolean;
}

export interface RuleResult {
  points: number;
  reasons: string[];
}

const hasClass = (list: string[], c: DraftClass) => list.some((b) => classesOf(b).includes(c));
const hasTag = (list: string[], t: BrawlerTag) => list.some((b) => tagsOf(b).includes(t));
const isAggressive = (list: string[]) => hasClass(list, 'tank') || hasClass(list, 'assassin');

/** El triángulo: control < tanque/asesino < antitanque < control. Se evalúa por rival para no contar doble a los multiclase. */
function triangle({ brawler, enemies }: RuleContext): RuleResult {
  const mine = classesOf(brawler);
  let points = 0;
  const wins: string[] = [];
  const loses: string[] = [];
  for (const enemy of enemies) {
    const theirs = classesOf(enemy);
    const adv = mine.some((m) => theirs.some((t) => beats(m, t))) ? 1 : 0;
    const dis = theirs.some((t) => mine.some((m) => beats(t, m))) ? 1 : 0;
    points += (adv - dis) * TRIANGLE_POINTS;
    if (adv > dis) wins.push(enemy);
    else if (dis > adv) loses.push(enemy);
  }
  const reasons: string[] = [];
  if (wins.length) reasons.push(`Gana en el triángulo de clases contra ${wins.join(', ')}`);
  if (loses.length) reasons.push(`Pierde en el triángulo de clases contra ${loses.join(', ')}`);
  return { points, reasons };
}

/** Reglas del método para cada modo (las del video). */
function modeRules(ctx: RuleContext): RuleResult {
  const { state, brawler, allies, enemies, isFirstPick, isLastPick } = ctx;
  const classes = classesOf(brawler);
  const tags = tagsOf(brawler);
  const f = isLastPick ? LAST_PICK_FACTOR : 1;
  let points = 0;
  const reasons: string[] = [];
  const add = (p: number, reason: string, scaled = false) => {
    points += scaled ? p * f : p;
    reasons.push(isLastPick && scaled ? `${reason} (último pick: cubre lo que falta)` : reason);
  };
  const is = (c: DraftClass) => classes.includes(c);

  switch (state.mode) {
    case 'brawlBall':
      if (is('antitank') && isFirstPick)
        add(6, 'En Balón Brawl el first pick ideal es un antitanque');
      if (is('antitank') && !hasClass(allies, 'antitank') && !isFirstPick) {
        add(4, 'Al equipo le falta un antitanque', true);
      }
      if (is('tank') && !hasClass(allies, 'tank'))
        add(3, 'Aporta un tanque para abrir espacio', true);
      break;
    case 'gemGrab':
      if (is('control') && !hasClass(allies, 'control')) add(4, 'El medio necesita control', true);
      if (is('sniper') && !is('antiassassin') && hasClass(enemies, 'assassin')) {
        add(-4, 'Un asesino rival castiga a este brawler de medio');
      }
      break;
    case 'heist':
      if (tags.includes('dano-caja') && !hasTag(allies, 'dano-caja')) {
        add(5, 'Aporta daño a la caja, que le falta al equipo', true);
      }
      if (
        (is('control') || is('antitank')) &&
        !hasClass(allies, 'control') &&
        !hasClass(allies, 'antitank')
      ) {
        add(3, 'Aporta defensa, que le falta al equipo', true);
      }
      break;
    case 'hotZone':
      if (is('control') && !hasClass(allies, 'control')) add(4, 'Aporta control de la zona', true);
      if (isAggressive([brawler]) && !isAggressive(allies))
        add(3, 'Crea espacio para sumar zona', true);
      if (is('antitank') && !hasClass(allies, 'antitank'))
        add(2, 'Protege la zona de los tanques', true);
      break;
    case 'knockout':
    case 'bounty': {
      const unsafe = (is('tank') || is('assassin')) && !tags.includes('escape');
      const onlyAntitank = is('antitank') && !is('control') && !is('sniper');
      if (isFirstPick && unsafe)
        add(-6, 'Poco estable de first pick: se puede contrapickear fácil');
      else if (isFirstPick && onlyAntitank) add(-4, 'Poco estable de first pick en este modo');
      if (isFirstPick && (is('sniper') || is('control'))) add(3, 'Pick difícil de contrapickear');
      break;
    }
    default:
  }

  // Un apoyo vale por lo que sostiene: el video insiste en que no es para matar.
  if (is('support') && !is('control') && !is('sniper')) {
    if (isAggressive(allies)) add(3, 'Apoyo para sostener a tu tanque o asesino');
    else if (allies.length > 0) add(-3, 'Apoyo sin un tanque o asesino al que sostener');
  }
  return { points, reasons };
}

/** Afinidad del brawler con las características del mapa. */
function mapRules({ state, brawler }: RuleContext): RuleResult {
  const data = getDraftData();
  const map = data.maps[state.map];
  if (!map) return { points: 0, reasons: [] };
  const keys: (DraftClass | BrawlerTag)[] = [...classesOf(brawler), ...tagsOf(brawler)];
  let units = 0;
  const good: string[] = [];
  for (const tag of map.tags) {
    const affinity = data.mapAffinity[tag] ?? {};
    const sum = keys.reduce((acc, k) => acc + (affinity[k] ?? 0), 0);
    units += sum;
    if (sum > 0) good.push(tag);
  }
  const points = Math.max(-MAP_CAP, Math.min(MAP_CAP, units * MAP_POINTS));
  if (!points) return { points: 0, reasons: [] };
  const label = map.note ?? map.tags.join(', ');
  return {
    points,
    reasons: [
      points > 0 ? `Va bien en este mapa (${label})` : `Rinde menos en este mapa (${label})`,
    ],
  };
}

/** Todas las reglas del método para un pick. */
export function methodRules(ctx: RuleContext): RuleResult {
  const parts = [triangle(ctx), modeRules(ctx), mapRules(ctx)];
  return {
    points: parts.reduce((s, p) => s + p.points, 0),
    reasons: parts.flatMap((p) => p.reasons),
  };
}

/** Qué le falta a un equipo del triángulo de clases (control, tanque o asesino, antitanque). */
export function triangleGaps(picks: string[]): string[] {
  const gaps: string[] = [];
  if (!hasClass(picks, 'control')) gaps.push('control');
  if (!isAggressive(picks)) gaps.push('tanque o asesino');
  if (!hasClass(picks, 'antitank')) gaps.push('antitanque');
  return gaps;
}
