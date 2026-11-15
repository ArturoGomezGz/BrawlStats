import type { BattleItem } from './schemas.js';

/** Batalla ya simplificada para mostrarla y guardarla. */
export interface BattleSummary {
  battleTime: string; // ISO 8601
  mode: string | null;
  map: string | null;
  brawler: string | null;
  result: 'victory' | 'defeat' | 'draw' | null;
  rank: number | null;
  trophyChange: number | null;
}

/** Supercell manda la hora como 20260101T120000.000Z; la pasamos a ISO 8601. */
export function parseBattleTime(value: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.(\d+))?Z$/.exec(value);
  if (!m) throw new Error(`battleTime con formato desconocido: ${value}`);
  const [, y, mo, d, h, mi, s, ms = '000'] = m;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.${ms.padEnd(3, '0').slice(0, 3)}Z`;
}

/** Resume una batalla del battlelog desde el punto de vista del jugador `playerTag` (sin '#'). */
export function summarizeBattle(item: BattleItem, playerTag: string): BattleSummary {
  const { battle, event } = item;
  const everyone = [...(battle.players ?? []), ...(battle.teams ?? []).flat()];
  const me = everyone.find((p) => p.tag.replace(/^#/, '') === playerTag);
  const result = battle.result;
  return {
    battleTime: parseBattleTime(item.battleTime),
    mode: event.mode ?? battle.mode ?? null,
    map: event.map ?? null,
    brawler: me?.brawler?.name ?? null,
    result: result === 'victory' || result === 'defeat' || result === 'draw' ? result : null,
    rank: battle.rank ?? null,
    trophyChange: battle.trophyChange ?? null,
  };
}
