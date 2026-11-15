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
