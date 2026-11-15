import type { ModeTemplate } from '../types.js';

/**
 * Plantillas por modo. Son una estimación del meta, no estadísticas medidas:
 * corrígelas cuando cambie el juego. Los brawlers que no aparecen valen DEFAULT_TIER.
 * Los nombres van en mayúsculas, como los devuelve Supercell.
 */
export const DEFAULT_TIER = 5.5;

/** Sinergias que valen en cualquier modo. [a, b, peso, motivo] */
export const COMMON_SYNERGIES: ModeTemplate['synergies'] = [
  ['POCO', 'EL PRIMO', 2.5, 'Poco cura al tanque en primera línea'],
  ['POCO', 'BULL', 2.5, 'Poco cura al tanque en primera línea'],
  ['POCO', 'DARRYL', 2, 'Poco cura al tanque en primera línea'],
  ['PAM', 'EL PRIMO', 2, 'La torreta de Pam sostiene a la primera línea'],
  ['GENE', 'BULL', 2, 'Gene acerca a los rivales al alcance del tanque'],
  ['GENE', 'DARRYL', 2, 'Gene acerca a los rivales al alcance del tanque'],
  ['MAX', 'EDGAR', 2, 'La velocidad de Max acompaña a los asesinos'],
  ['MAX', 'MORTIS', 2, 'La velocidad de Max acompaña a los asesinos'],
  ['BYRON', 'BROCK', 1.5, 'Byron cura mientras el francotirador castiga'],
  ['AMBER', 'BULL', 1.5, 'El fuego de Amber frena a quien evita al tanque'],
  ['SANDY', 'PIPER', 2, 'Sandy esconde al francotirador'],
  ['SANDY', 'BEA', 2, 'Sandy esconde al francotirador'],
  ['GALE', 'EL PRIMO', 1.5, 'Gale empuja a los rivales hacia el tanque'],
  ['EMZ', 'ROSA', 1.5, 'El humo de Emz frena a quien huye de Rosa'],
  ['LOU', 'BULL', 1.5, 'Lou congela a los rivales cerca del tanque'],
  ['TICK', 'SPROUT', 1.5, 'Doble control de espacio detrás de la pared'],
  ['BARLEY', 'DYNAMIKE', 1.5, 'Doble lanzador: presión constante detrás de las paredes'],
  ['GRIFF', 'POCO', 1, 'Daño sostenido con curación'],
  ['COLETTE', 'JACKY', 1.5, 'Colette castiga a los tanques que Jacky ancla'],
];

/** Counters generales: el atacante gana el duelo contra la víctima. [atacante, víctima, peso, motivo] */
export const COMMON_COUNTERS: ModeTemplate['counters'] = [
  ['COLETTE', 'EL PRIMO', 3, 'El daño por porcentaje derrite a los tanques'],
  ['COLETTE', 'BULL', 3, 'El daño por porcentaje derrite a los tanques'],
  ['COLETTE', 'DARRYL', 3, 'El daño por porcentaje derrite a los tanques'],
  ['COLETTE', 'FRANK', 2.5, 'El daño por porcentaje derrite a los tanques'],
  ['SPIKE', 'MORTIS', 2, 'Spike corta a los asesinos al acercarse'],
  ['SHELLY', 'MORTIS', 2, 'Shelly detiene a los asesinos al acercarse'],
  ['SHELLY', 'LEON', 1.5, 'Shelly detiene a los asesinos al acercarse'],
  ['CROW', 'EL PRIMO', 1.5, 'Crow lo castiga sin dejarse alcanzar'],
  ['PIPER', 'EL PRIMO', 2, 'Piper lo castiga a distancia'],
  ['PIPER', 'BULL', 2, 'Piper lo castiga a distancia'],
  ['BROCK', 'EL PRIMO', 1.5, 'Brock lo castiga a distancia'],
  ['BARLEY', 'EL PRIMO', 2, 'Los lanzadores castigan a los tanques lentos'],
  ['DYNAMIKE', 'EL PRIMO', 2, 'Los lanzadores castigan a los tanques lentos'],
  ['TICK', 'BULL', 1.5, 'Los lanzadores castigan a los tanques lentos'],
  ['EDGAR', 'PIPER', 2.5, 'Los asesinos alcanzan a los francotiradores'],
  ['EDGAR', 'BROCK', 2, 'Los asesinos alcanzan a los francotiradores'],
  ['MORTIS', 'PIPER', 2, 'Los asesinos alcanzan a los francotiradores'],
  ['LEON', 'PIPER', 2, 'Los asesinos alcanzan a los francotiradores'],
  ['LEON', 'BROCK', 2, 'Los asesinos alcanzan a los francotiradores'],
  ['FANG', 'BEA', 1.5, 'Los asesinos alcanzan a los francotiradores'],
  ['BULL', 'PIPER', 1.5, 'El tanque llega al francotirador'],
  ['BULL', 'LEON', 1, 'Bull aguanta la ráfaga de Leon'],
  ['DARRYL', 'LEON', 1, 'Darryl aguanta la ráfaga de Leon'],
  ['AMBER', 'BULL', 1.5, 'El fuego de Amber frena al tanque'],
  ['EMZ', 'MORTIS', 1.5, 'El humo de Emz detiene el rebote'],
  ['EMZ', 'EL PRIMO', 1.5, 'El humo de Emz frena al tanque'],
  ['LOU', 'EDGAR', 1.5, 'El hielo de Lou detiene al asesino'],
  ['SANDY', 'LEON', 1.5, 'La tormenta de Sandy anula la invisibilidad'],
  ['SANDY', 'MORTIS', 1, 'La tormenta de Sandy anula al asesino'],
  ['SURGE', 'BULL', 1, 'Surge mejora y aguanta frente al tanque'],
  ['EVE', 'EL PRIMO', 1, 'Los bichos de Eve castigan al tanque'],
  ['JANET', 'EL PRIMO', 1.5, 'Janet castiga al tanque desde el aire'],
];

const t = (list: [number, string[]][]): Record<string, number> =>
  Object.fromEntries(list.flatMap(([tier, names]) => names.map((n) => [n, tier])));

export const TEMPLATES: Record<string, ModeTemplate> = {
  gemGrab: {
    label: 'Atrapagemas',
    tiers: t([
      [8.5, ['SANDY', 'GALE', 'EMZ', 'AMBER', 'POCO', 'PAM', 'GENE', 'BYRON', 'MAX']],
      [7.5, ['SPROUT', 'TICK', 'BARLEY', 'WILLOW', 'MR. P', 'LOU', 'COLETTE', 'JANET']],
      [7, ['PIPER', 'SURGE', 'OTIS', 'GRIFF', 'SPIKE', 'LOLA', 'CHARLIE', 'NITA']],
      [3.5, ['EDGAR', 'MORTIS', 'LEON', 'FANG', 'EL PRIMO', 'BULL', 'JACKY']],
    ]),
    roleNeeds: { controller: 0.9, support: 0.8, thrower: 0.7, sniper: 0.3, tank: 0.3 },
    synergies: [
      ['SPROUT', 'POCO', 2, 'Control del centro con curación'],
      ['TICK', 'GALE', 1.5, 'Presión constante sobre el centro'],
      ['AMBER', 'SANDY', 1.5, 'Zona del centro bloqueada para los rivales'],
      ['PAM', 'BARLEY', 1.5, 'La torreta de Pam defiende a quien lleva las gemas'],
    ],
    counters: [],
    maps: {
      'Mina Rocosa': {
        note: 'Mapa con muchos arbustos: el control de zona vale oro',
        adjust: { SANDY: 0.5, AMBER: 0.5 },
      },
    },
  },
  brawlBall: {
    label: 'Balón Brawl',
    tiers: t([
      [8.5, ['EL PRIMO', 'BULL', 'DARRYL', 'ROSA', 'FRANK', 'MAX', 'EDGAR', 'BUSTER', 'JACKY']],
      [7.5, ['MORTIS', 'FANG', 'POCO', 'GENE', 'GALE', 'CARL', 'SURGE', 'DRACO', 'ASH']],
      [7, ['SHELLY', 'BIBI', 'STU', 'LOU', 'AMBER', 'PAM', 'SANDY', 'OTIS']],
      [3.5, ['PIPER', 'BROCK', 'BEA', 'BELLE', 'NANI', 'TICK', 'SPROUT']],
    ]),
    roleNeeds: { tank: 0.9, assassin: 0.6, support: 0.6, controller: 0.4 },
    synergies: [
      ['EL PRIMO', 'MAX', 1.5, 'Velocidad y pegada para entrar al área'],
      ['DARRYL', 'MAX', 1.5, 'Velocidad y pegada para entrar al área'],
      ['MORTIS', 'GENE', 1.5, 'Gene mantiene al asesino sobre el portador'],
    ],
    counters: [['BARLEY', 'EL PRIMO', 1, 'Mucho espacio abierto para castigar al tanque']],
    maps: {
      'Pateando Fuerte': {
        note: 'Mapa abierto: el alcance pesa más',
        adjust: { PIPER: 1, BROCK: 1, EDGAR: -0.5 },
      },
    },
  },
  heist: {
    label: 'Atraco',
    tiers: t([
      [
        8.5,
        ['DYNAMIKE', 'COLT', 'RICO', 'BARLEY', 'PENNY', 'GRIFF', 'CARL', 'STU', 'R-T', 'DARRYL'],
      ],
      [7.5, ['BROCK', 'PIPER', 'EL PRIMO', 'BULL', 'JESSIE', 'SPIKE', 'LILY', 'SURGE', 'TICK']],
      [6.5, ['SHELLY', 'FRANK', 'ROSA', 'MAX', 'BYRON', 'GENE']],
      [3.5, ['POCO', 'MORTIS', 'LEON', 'PAM', 'NITA', 'SANDY']],
    ]),
    roleNeeds: { damage: 0.9, thrower: 0.6, tank: 0.5, sniper: 0.4 },
    synergies: [
      ['DYNAMIKE', 'BARLEY', 1.5, 'Doble daño por encima de las paredes'],
      ['COLT', 'RICO', 1, 'Daño sostenido sobre la caja'],
    ],
    counters: [],
    maps: {},
  },
  bounty: {
    label: 'Caza Estelar',
    tiers: t([
      [
        8.5,
        ['PIPER', 'BROCK', 'BEA', 'BELLE', 'ANGELO', 'NANI', 'COLETTE', 'JANET', 'MAISIE', 'COLT'],
      ],
      [7.5, ['SPIKE', 'RICO', 'CROW', 'GENE', 'AMBER', 'SANDY', 'MR. P', 'BYRON', 'EMZ']],
      [6.5, ['BO', 'PENNY', 'TICK', 'SQUEAK', 'LOU', 'GALE']],
      [3.5, ['EL PRIMO', 'BULL', 'DARRYL', 'FRANK', 'ROSA', 'JACKY', 'DRACO']],
    ]),
    roleNeeds: { sniper: 0.9, controller: 0.5, support: 0.5, damage: 0.4 },
    synergies: [
      ['PIPER', 'SANDY', 1.5, 'Sandy oculta al francotirador para no regalar estrellas'],
      ['BEA', 'SANDY', 1.5, 'Sandy oculta al francotirador para no regalar estrellas'],
      ['BELLE', 'AMBER', 1, 'Alcance largo con control de zona'],
    ],
    counters: [],
    maps: {},
  },
  hotZone: {
    label: 'Zona Restringida',
    tiers: t([
      [8.5, ['EMZ', 'AMBER', 'SANDY', 'LOU', 'GALE', 'POCO', 'GENE', 'BYRON', 'SPROUT', 'OTIS']],
      [7.5, ['PAM', 'TICK', 'BARLEY', 'DARRYL', 'EL PRIMO', 'MAX', 'SURGE', 'CHARLIE', 'WILLOW']],
      [7, ['DYNAMIKE', 'JESSIE', 'NITA', 'BEA', 'COLETTE', 'ROSA']],
      [3.5, ['PIPER', 'BROCK', 'LEON', 'EDGAR', 'MORTIS', 'FANG']],
    ]),
    roleNeeds: { controller: 0.9, support: 0.8, tank: 0.5, thrower: 0.5 },
    synergies: [
      ['EMZ', 'POCO', 1.5, 'Control constante de la zona con curación'],
      ['AMBER', 'LOU', 1.5, 'Zona del centro castigada por todos lados'],
    ],
    counters: [],
    maps: {},
  },
  knockout: {
    label: 'Noqueo',
    tiers: t([
      [
        8.5,
        ['PIPER', 'BROCK', 'BEA', 'BELLE', 'ANGELO', 'COLETTE', 'JANET', 'MAISIE', 'SANDY', 'GENE'],
      ],
      [7.5, ['COLT', 'RICO', 'SPIKE', 'CROW', 'AMBER', 'EMZ', 'BYRON', 'MR. P', 'NANI']],
      [7, ['PENNY', 'BARLEY', 'TICK', 'LOU', 'GALE', 'POCO']],
      [3.5, ['EL PRIMO', 'BULL', 'DARRYL', 'FRANK', 'JACKY', 'ROSA']],
    ]),
    roleNeeds: { sniper: 0.9, controller: 0.5, support: 0.6 },
    synergies: [
      ['BELLE', 'POCO', 1, 'Daño a distancia con curación'],
      ['PIPER', 'SANDY', 1.5, 'Sandy oculta al francotirador'],
    ],
    counters: [],
    maps: {},
  },
};

export const MODE_IDS = Object.keys(TEMPLATES);
