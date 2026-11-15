import type { Role } from '../types.js';

const byRole: Record<Role, string[]> = {
  tank: [
    'BULL',
    'EL PRIMO',
    'DARRYL',
    'FRANK',
    'ROSA',
    'JACKY',
    'ASH',
    'BUSTER',
    'HANK',
    'DRACO',
    'BIBI',
    'SAM',
    'MEG',
    'CHUCK',
    'DOUG',
  ],
  assassin: ['MORTIS', 'LEON', 'EDGAR', 'FANG', 'CROW', 'KENJI', 'SHADE', 'CORDELIUS', 'BUZZ'],
  sniper: ['PIPER', 'BROCK', 'BEA', 'BELLE', 'ANGELO', 'NANI', 'MAISIE', 'COLETTE', 'JANET'],
  thrower: ['BARLEY', 'DYNAMIKE', 'TICK', 'GROM', 'WILLOW', 'SQUEAK', 'SPROUT', 'LARRY & LAWRIE'],
  controller: ['EMZ', 'SANDY', 'AMBER', 'LOU', 'CHARLIE', 'GALE', 'MR. P', 'SURGE', 'OTIS', 'LOLA'],
  support: ['POCO', 'PAM', 'GENE', 'BYRON', 'MAX', 'NITA', 'JESSIE', 'GRAY', 'BERRY', 'KIT'],
  damage: [
    'SHELLY',
    'COLT',
    'RICO',
    'SPIKE',
    'BO',
    'PENNY',
    '8-BIT',
    'CARL',
    'STU',
    'GRIFF',
    'R-T',
    'LILY',
    'TARA',
    'GUS',
    'BONNIE',
    'EVE',
    'MANDY',
    'PEARL',
    'MICO',
    'MELODIE',
    'CLANCY',
    'MOE',
  ],
};

export const ROLE_OF: Record<string, Role> = {};
for (const [role, names] of Object.entries(byRole)) {
  for (const name of names) ROLE_OF[name] = role as Role;
}

export const roleOf = (brawler: string): Role | undefined => ROLE_OF[brawler];

/** Nombres con rol conocido: sirve de lista de respaldo si Supercell no responde. */
export const KNOWN_BRAWLERS: string[] = Object.keys(ROLE_OF).sort();

export const ROLE_LABEL: Record<Role, string> = {
  tank: 'tanque',
  damage: 'daño',
  assassin: 'asesino',
  sniper: 'francotirador',
  thrower: 'lanzador',
  controller: 'control',
  support: 'apoyo',
};
