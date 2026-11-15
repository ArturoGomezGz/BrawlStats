import { createServer, type Server } from 'node:http';

/**
 * Servidor que imita la API de Supercell para desarrollar y probar sin llave.
 * Tags conocidos: jugadores #2PP y #8Q0, club #YQ2.
 */

interface FakeBattle {
  battleTime: string; // formato de Supercell: 20260101T120000.000Z
  mode: string;
  map: string;
  brawler: string;
  result: 'victory' | 'defeat';
  trophyChange: number;
}

const toSupercellTime = (d: Date) => d.toISOString().replace(/[-:]/g, '');

export interface FakeSupercell {
  url: string;
  close(): Promise<void>;
  /** Agrega una batalla reciente al battlelog del jugador #2PP. */
  addBattle(result: 'victory' | 'defeat', at?: Date): void;
  /** Cuántas peticiones recibió, por ruta. */
  requests: string[];
  /** Fuerza el código de respuesta de todas las peticiones (por ejemplo 429 o 403). */
  forceStatus(status: number | null): void;
}

const MODES: [string, string][] = [
  ['gemGrab', 'Hard Rock Mine'],
  ['brawlBall', 'Super Beach'],
  ['heist', 'Safe Zone'],
  ['bounty', 'Shooting Star'],
];
const BRAWLERS = ['SHELLY', 'COLT', 'NITA', 'EL PRIMO', 'BULL'];

function seedBattles(): FakeBattle[] {
  const now = Date.now();
  return Array.from({ length: 12 }, (_, i) => {
    const [mode, map] = MODES[i % MODES.length]!;
    const won = i % 3 !== 2;
    return {
      battleTime: toSupercellTime(new Date(now - (i + 1) * 20 * 60_000)),
      mode,
      map,
      brawler: BRAWLERS[i % BRAWLERS.length]!,
      result: won ? 'victory' : 'defeat',
      trophyChange: won ? 8 : -6,
    } as FakeBattle;
  });
}

export async function startFakeSupercell(port = 0): Promise<FakeSupercell> {
  const battles = seedBattles();
  const requests: string[] = [];
  let forced: number | null = null;
  let trophies = 18450;

  const player = (tag: string) => ({
    tag: `#${tag}`,
    name: tag === '2PP' ? 'Ana' : 'Beto',
    nameColor: '0xffffffff',
    icon: { id: 28000000 },
    trophies,
    highestTrophies: 21000,
    expLevel: 187,
    '3vs3Victories': 4210,
    soloVictories: 880,
    duoVictories: 640,
    club: { tag: '#YQ2', name: 'Los Brawlers' },
    brawlers: BRAWLERS.map((name, i) => ({
      id: 16000000 + i,
      name,
      power: 11 - i,
      rank: 25 - i,
      trophies: 700 - i * 40,
      highestTrophies: 800 - i * 40,
    })),
  });

  const battlelog = () => ({
    items: battles.map((b) => ({
      battleTime: b.battleTime,
      event: { id: 1, mode: b.mode, map: b.map },
      battle: {
        mode: b.mode,
        type: 'ranked',
        result: b.result,
        duration: 95,
        trophyChange: b.trophyChange,
        teams: [
          [
            {
              tag: '#2PP',
              name: 'Ana',
              brawler: { id: 1, name: b.brawler, power: 11, trophies: 600 },
            },
            {
              tag: '#8Q0',
              name: 'Beto',
              brawler: { id: 2, name: 'COLT', power: 10, trophies: 580 },
            },
          ],
          [
            {
              tag: '#GGG',
              name: 'Rival',
              brawler: { id: 3, name: 'BULL', power: 9, trophies: 500 },
            },
          ],
        ],
      },
    })),
  });

  const club = () => ({
    tag: '#YQ2',
    name: 'Los Brawlers',
    description: 'Club de prueba',
    type: 'inviteOnly',
    requiredTrophies: 1000,
    trophies: 640000,
    members: [
      { tag: '#2PP', name: 'Ana', role: 'president', trophies: trophies },
      { tag: '#8Q0', name: 'Beto', role: 'member', trophies: 17200 },
    ],
  });

  const server: Server = createServer((req, res) => {
    const url = decodeURIComponent(req.url ?? '');
    requests.push(url);
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (forced) return send(forced, { reason: 'forced' });

    let m: RegExpExecArray | null;
    if ((m = /^\/v1\/players\/#(\w+)\/battlelog$/.exec(url))) {
      return m[1] === '2PP' ? send(200, battlelog()) : send(404, { reason: 'notFound' });
    }
    if ((m = /^\/v1\/players\/#(\w+)$/.exec(url))) {
      return m[1] === '2PP' || m[1] === '8Q0'
        ? send(200, player(m[1]))
        : send(404, { reason: 'notFound' });
    }
    if (url === '/v1/brawlers') {
      const names = ['SHELLY', 'COLT', 'BULL', 'BROCK', 'EL PRIMO', 'POCO', 'EDGAR', 'PIPER'];
      return send(200, { items: names.map((name, i) => ({ id: 16000000 + i, name })) });
    }
    if ((m = /^\/v1\/clubs\/#(\w+)$/.exec(url))) {
      return m[1] === 'YQ2' ? send(200, club()) : send(404, { reason: 'notFound' });
    }
    return send(404, { reason: 'notFound' });
  });

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;

  return {
    url: `http://127.0.0.1:${actualPort}/v1`,
    requests,
    close: () => new Promise((resolve) => server.close(() => resolve())),
    addBattle(result, at = new Date()) {
      const [mode, map] = MODES[0]!;
      battles.unshift({
        battleTime: toSupercellTime(at),
        mode,
        map,
        brawler: 'SHELLY',
        result,
        trophyChange: result === 'victory' ? 8 : -6,
      });
      trophies += result === 'victory' ? 8 : -6;
    },
    forceStatus(status) {
      forced = status;
    },
  };
}

// Para desarrollo local: `node dist/fake-server.js` (puerto 4100 por defecto).
if (process.argv[1]?.endsWith('fake-server.js')) {
  const fake = await startFakeSupercell(Number(process.env.FAKE_PORT ?? 4100));
  console.log(`Supercell simulado en ${fake.url}`);
}
