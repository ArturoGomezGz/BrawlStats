import type { MapAffinity, MapProfile } from '../types.js';

/**
 * Características de los mapas más jugados, por nombre tal como llega en la partida.
 * Es editable y cambia con las rotaciones: agrega mapas aquí o con `setDraftData`.
 */
export const MAP_PROFILES: Record<string, MapProfile> = {
  'Hard Rock Mine': { tags: ['arbustos'], note: 'Muchos arbustos' },
  'Pateando Fuerte': { tags: ['abierto'], note: 'Mapa abierto' },
  'Bridge Too Far': { tags: ['agua', 'abierto', 'lineas-largas'], note: 'Agua y líneas largas' },
  'Pinhole Punt': { tags: ['muros'], note: 'Muchos muros' },
};

/** Cuántas unidades de afinidad da cada característica del mapa. 1 unidad vale `MAP_POINTS`. */
export const MAP_AFFINITY: MapAffinity = {
  agua: { agua: 2 },
  abierto: { rango: 1, sniper: 0.5 },
  'lineas-largas': { rango: 1.5, sniper: 1 },
  muros: { 'rompe-muros': 1, rebote: 1, thrower: 1, tank: 0.5 },
  arbustos: { tank: 0.8, assassin: 0.8, control: 0.8, arbusto: 1.2 },
};
