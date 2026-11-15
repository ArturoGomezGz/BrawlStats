import { describe, expect, it } from 'vitest';
import { createBrawlClient, BrawlApiError } from './client.js';
import { parseBattleTime, summarizeBattle } from './battle.js';
import { normalizeTag } from './tag.js';
import { battleItemSchema } from './schemas.js';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('normalizeTag', () => {
  it('quita # y espacios, pasa a mayúsculas y cambia O por 0', () => {
    expect(normalizeTag(' #8q o9 ')).toBe('8Q09');
    expect(normalizeTag('#ABC')).toBeNull();
  });
});

describe('createBrawlClient', () => {
  it('pide el jugador con el tag codificado y la llave', async () => {
    let seen: { url: string; auth: string | null } | undefined;
    const client = createBrawlClient({
      token: 'secreto',
      baseUrl: 'https://api.test/v1/',
      fetch: async (url, init) => {
        seen = { url: String(url), auth: new Headers(init?.headers).get('authorization') };
        return json({
          tag: '#2PP',
          name: 'Ana',
          trophies: 100,
          highestTrophies: 200,
          expLevel: 5,
          brawlers: [],
        });
      },
    });
    const player = await client.getPlayer('#2pp');
    expect(player.name).toBe('Ana');
    expect(seen).toEqual({ url: 'https://api.test/v1/players/%232PP', auth: 'Bearer secreto' });
  });

  it('traduce los errores de Supercell', async () => {
    const mk = (status: number) =>
      createBrawlClient({ token: 't', fetch: async () => json({}, status) });
    await expect(mk(404).getPlayer('2PP')).rejects.toMatchObject({ kind: 'not_found' });
    await expect(mk(429).getPlayer('2PP')).rejects.toMatchObject({ kind: 'rate_limited' });
    await expect(mk(403).getPlayer('2PP')).rejects.toMatchObject({ kind: 'unauthorized' });
    await expect(mk(500).getPlayer('2PP')).rejects.toMatchObject({ kind: 'unavailable' });
    await expect(mk(200).getPlayer('2PP')).rejects.toMatchObject({ kind: 'bad_response' });
    await expect(mk(200).getPlayer('zzz')).rejects.toBeInstanceOf(BrawlApiError);
  });
});

describe('battlelog', () => {
  it('convierte la hora de Supercell a ISO', () => {
    expect(parseBattleTime('20260101T120000.000Z')).toBe('2026-01-01T12:00:00.000Z');
  });

  it('resume una batalla desde el punto de vista del jugador', () => {
    const item = battleItemSchema.parse({
      battleTime: '20260101T120000.000Z',
      event: { id: 1, mode: 'gemGrab', map: 'Hard Rock Mine' },
      battle: {
        mode: 'gemGrab',
        type: 'ranked',
        result: 'victory',
        trophyChange: 8,
        teams: [
          [{ tag: '#2PP', name: 'Ana', brawler: { id: 1, name: 'SHELLY' } }],
          [{ tag: '#8Q0', name: 'Beto', brawler: { id: 2, name: 'COLT' } }],
        ],
      },
    });
    expect(summarizeBattle(item, '2PP')).toEqual({
      battleTime: '2026-01-01T12:00:00.000Z',
      mode: 'gemGrab',
      map: 'Hard Rock Mine',
      brawler: 'SHELLY',
      result: 'victory',
      rank: null,
      trophyChange: 8,
    });
  });
});
