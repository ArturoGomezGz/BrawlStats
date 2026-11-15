import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql as dsql } from 'drizzle-orm';
import { createBrawlClient } from '@brawlstats/brawl-client';
import { startFakeSupercell, type FakeSupercell } from '@brawlstats/brawl-client/fake';
import { createServices } from '@brawlstats/core';
import { createDb, runMigrations } from '@brawlstats/db';
import { buildServer } from './server.js';

// Estas pruebas usan un Postgres real (DATABASE_URL); sin él se omiten.
const url = process.env.DATABASE_URL;

describe.skipIf(!url)('api', () => {
  let fake: FakeSupercell;
  let app: ReturnType<typeof buildServer>;
  let close: () => Promise<void>;
  let services: ReturnType<typeof createServices>;
  let reset: () => Promise<void>;

  beforeAll(async () => {
    const { db, sql } = createDb(url);
    await runMigrations(db);
    fake = await startFakeSupercell();
    services = createServices(db, createBrawlClient({ token: 't', baseUrl: fake.url }));
    app = buildServer(services);
    reset = async () => {
      await db.execute(dsql`truncate players, api_cache cascade`);
    };
    close = async () => {
      await app.close();
      await fake.close();
      await sql.end();
    };
  });
  afterAll(() => close());
  beforeEach(async () => {
    await reset();
    fake.forceStatus(null);
    fake.requests.length = 0;
  });

  it('GET /health', async () => {
    const res = await app.inject('/health');
    expect(res.json()).toEqual({ status: 'ok', service: 'api' });
  });

  it('devuelve el jugador y lo marca como no seguido', async () => {
    const res = await app.inject('/players/2pp');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ name: 'Ana', trophies: 18450, tracked: false });
  });

  it('usa la caché y no repite la petición a Supercell', async () => {
    await app.inject('/players/2PP');
    await app.inject('/players/2PP');
    expect(fake.requests.filter((r) => r.endsWith('/players/#2PP'))).toHaveLength(1);
  });

  it('si Supercell limita las peticiones sirve la copia vencida', async () => {
    await app.inject('/players/2PP');
    await services.getClub('YQ2');
    const { db, sql } = createDb(url);
    await db.execute(dsql`update api_cache set expires_at = now() - interval '1 minute'`);
    fake.forceStatus(429);
    const res = await app.inject('/players/2PP');
    expect(res.statusCode).toBe(200);
    await sql.end();
  });

  it('traduce errores: tag inválido, desconocido, llave mala y límite', async () => {
    expect((await app.inject('/players/zzz')).statusCode).toBe(400);
    expect((await app.inject('/players/999')).statusCode).toBe(404);
    fake.forceStatus(403);
    const unauthorized = await app.inject('/players/8Q0');
    expect(unauthorized.statusCode).toBe(502);
    expect(unauthorized.json()).toMatchObject({ error: 'unauthorized' });
    fake.forceStatus(429);
    expect((await app.inject('/clubs/YQ2')).statusCode).toBe(503);
  });

  it('resume las batallas con su win rate', async () => {
    const res = await app.inject('/players/2PP/battlelog');
    const body = res.json();
    expect(body.battles).toHaveLength(12);
    expect(body.battles[0]).toMatchObject({
      mode: 'gemGrab',
      brawler: 'SHELLY',
      result: 'victory',
    });
    expect(body.winRate).toBeCloseTo(8 / 12);
  });

  it('devuelve el club', async () => {
    const res = await app.inject('/clubs/YQ2');
    expect(res.json()).toMatchObject({ name: 'Los Brawlers' });
    expect(res.json().members).toHaveLength(2);
  });

  it('seguir guarda batallas y trofeos, y sincronizar no duplica', async () => {
    const follow = await app.inject({ method: 'PUT', url: '/players/2PP/follow' });
    expect(follow.json()).toEqual({ tracked: true, newBattles: 12 });

    const again = await services.syncPlayer('2PP');
    expect(again.newBattles).toBe(0);

    fake.addBattle('victory', new Date(Date.now() + 1000));
    const third = await services.syncPlayer('2PP');
    expect(third.newBattles).toBe(1);

    const history = (await app.inject('/players/2PP/history')).json();
    expect(history.tracked).toBe(true);
    expect(history.totalBattles).toBe(13);
    expect(history.trophies).toHaveLength(3);
    expect(history.trophies.at(-1).trophies).toBe(18458);
    const wins = history.daily.reduce((n: number, d: { wins: number }) => n + d.wins, 0);
    expect(wins).toBe(9);
  });

  it('el perfil refleja que el jugador está seguido, y dejar de seguir lo quita', async () => {
    await app.inject({ method: 'PUT', url: '/players/2PP/follow' });
    expect((await app.inject('/players/2PP')).json().tracked).toBe(true);
    await app.inject({ method: 'DELETE', url: '/players/2PP/follow' });
    expect((await app.inject('/players/2PP')).json().tracked).toBe(false);
  });

  it('seguir a un jugador que no existe devuelve 404', async () => {
    const res = await app.inject({ method: 'PUT', url: '/players/999/follow' });
    expect(res.statusCode).toBe(404);
  });

  it('listPlayersToSync solo incluye seguidos consultados hace poco', async () => {
    await app.inject({ method: 'PUT', url: '/players/2PP/follow' });
    await app.inject('/players/8Q0'); // consultado pero no seguido
    expect(await services.listPlayersToSync()).toEqual(['2PP']);
  });
});
