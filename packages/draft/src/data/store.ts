import type { DraftData } from '../types.js';
import { MAP_AFFINITY, MAP_PROFILES } from './maps.js';
import { BRAWLER_PROFILES } from './profiles.js';

const CLASSES = [
  'control',
  'tank',
  'assassin',
  'antitank',
  'antiassassin',
  'support',
  'sniper',
  'thrower',
];
const BRAWLER_TAGS = [
  'hiper',
  'stun',
  'rompe-muros',
  'area',
  'rango',
  'agua',
  'dano-caja',
  'escape',
  'rebote',
  'arbusto',
];
const MAP_TAGS = ['muros', 'arbustos', 'agua', 'abierto', 'lineas-largas'];

export const DEFAULT_DRAFT_DATA: DraftData = {
  season: 'inicial',
  brawlers: BRAWLER_PROFILES,
  maps: MAP_PROFILES,
  mapAffinity: MAP_AFFINITY,
};

let current: DraftData = DEFAULT_DRAFT_DATA;

export const getDraftData = (): DraftData => current;

/** Errores de un `DraftData` (vacío si es válido). Sirve para revisar lo que genere una IA antes de usarlo. */
export function validateDraftData(data: unknown): string[] {
  const errors: string[] = [];
  const d = data as Partial<DraftData> | null;
  if (!d || typeof d !== 'object') return ['Los datos no son un objeto'];
  if (typeof d.season !== 'string') errors.push('season debe ser texto');
  for (const [name, p] of Object.entries(d.brawlers ?? {})) {
    if (!Array.isArray(p?.classes) || p.classes.length === 0) {
      errors.push(`${name}: classes debe tener al menos una clase`);
      continue;
    }
    for (const c of p.classes)
      if (!CLASSES.includes(c)) errors.push(`${name}: clase desconocida "${c}"`);
    for (const t of p.tags ?? [])
      if (!BRAWLER_TAGS.includes(t)) errors.push(`${name}: etiqueta desconocida "${t}"`);
  }
  if (!d.brawlers) errors.push('falta brawlers');
  for (const [map, m] of Object.entries(d.maps ?? {})) {
    for (const t of m?.tags ?? [])
      if (!MAP_TAGS.includes(t)) errors.push(`mapa ${map}: etiqueta desconocida "${t}"`);
  }
  if (!d.maps) errors.push('falta maps');
  for (const tag of MAP_TAGS) {
    if (!d.mapAffinity?.[tag as keyof DraftData['mapAffinity']])
      errors.push(`mapAffinity sin "${tag}"`);
  }
  return errors;
}

/** Reemplaza los datos del método. Lanza si no son válidos. Sin argumento, vuelve a los de fábrica. */
export function setDraftData(data?: DraftData): void {
  if (!data) {
    current = DEFAULT_DRAFT_DATA;
    return;
  }
  const errors = validateDraftData(data);
  if (errors.length) throw new Error(`Datos de draft inválidos: ${errors.slice(0, 5).join('; ')}`);
  current = data;
}
