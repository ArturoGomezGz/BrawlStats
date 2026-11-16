export type Team = 'A' | 'B';
export type StepType = 'ban' | 'pick';
export type Role = 'tank' | 'damage' | 'assassin' | 'sniper' | 'thrower' | 'controller' | 'support';

export interface Step {
  type: StepType;
  team: Team;
}

export interface DraftAction extends Step {
  brawler: string;
}

export interface DraftState {
  /** Id del modo de Supercell, por ejemplo `gemGrab`. */
  mode: string;
  /** Nombre del mapa; vacío si no se eligió. */
  map: string;
  /** Equipo que abre los bans y el primer pick. */
  firstTeam: Team;
  /** Acciones ya hechas, en orden. */
  actions: DraftAction[];
}

export interface Suggestion {
  brawler: string;
  /** Puntaje relativo (mayor es mejor); solo sirve para ordenar. */
  score: number;
  reasons: string[];
}

/** Datos de un modo: niveles, composición ideal, sinergias y counters propios del modo. */
export interface ModeTemplate {
  label: string;
  /** Nivel de 0 a 10 por brawler. Los que no aparecen valen `DEFAULT_TIER`. */
  tiers: Record<string, number>;
  /** Cuánto pesa tener cada rol en el equipo (0 a 1). */
  roleNeeds: Partial<Record<Role, number>>;
  synergies: [string, string, number, string?][];
  counters: [attacker: string, victim: string, weight: number, note?: string][];
  /** Ajustes por mapa: sumados al nivel del brawler en ese mapa. */
  maps: Record<string, { note?: string; adjust: Record<string, number> }>;
}

/** Clases del método de draft: el triángulo control, tanque/asesino y antitanque, más los especialistas. */
export type DraftClass =
  'control' | 'tank' | 'assassin' | 'antitank' | 'antiassassin' | 'support' | 'sniper' | 'thrower';

/** Etiquetas de habilidad de un brawler. */
export type BrawlerTag =
  | 'hiper'
  | 'stun'
  | 'rompe-muros'
  | 'area'
  | 'rango'
  | 'agua'
  | 'dano-caja'
  | 'escape'
  | 'rebote'
  | 'arbusto';

/** Características de un mapa que cambian qué brawlers sirven. */
export type MapTag = 'muros' | 'arbustos' | 'agua' | 'abierto' | 'lineas-largas';

export interface BrawlerProfile {
  /** Un brawler puede cumplir varias clases (Lou: control y antitanque, no antiasesino). */
  classes: DraftClass[];
  tags?: BrawlerTag[];
}

export interface MapProfile {
  note?: string;
  tags: MapTag[];
}

/** Cuántos puntos de afinidad da cada etiqueta de mapa a una clase o etiqueta de brawler. */
export type MapAffinity = Record<MapTag, Partial<Record<DraftClass | BrawlerTag, number>>>;

/**
 * Datos editables del método. Cambian por temporada: se pueden reemplazar con `setDraftData`
 * sin tocar el motor (por ejemplo, con lo que genere una IA o un panel).
 */
export interface DraftData {
  /** Etiqueta libre, por ejemplo `2026-T3`. Solo informativa. */
  season: string;
  brawlers: Record<string, BrawlerProfile>;
  maps: Record<string, MapProfile>;
  mapAffinity: MapAffinity;
}
