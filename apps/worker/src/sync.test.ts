import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql as dsql } from 'drizzle-orm';
import { createBrawlClient } from '@brawlstats/brawl-client';
import { startFakeSupercell, type FakeSupercell } from '@brawlstats/brawl-client/fake';
import { createServices } from '@brawlstats/core';
import { createDb, runMigrations } from '@brawlstats/db';
import { runSync } from './sync.js';

const url = process.env.DATABASE_URL;
const quiet = { info: () => {}, error: () => {} };

describe.skipIf(!url)('runSync', () => {
  let fake: FakeSupercell;
  let services: ReturnType<typeof createServices>;
  let handle: ReturnType<typeof createDb>;

  beforeAll(async () => {
    handle = createDb(url);
    await runMigrations(handle.db);
    fake = await startFakeSupercell();
    services = createServices(handle.db, createBrawlClient({ token: 't', baseUrl: fake.url }));
  });
  afterAll(async () => {
    await fake.close();
    await handle.sql.end();
  });
  beforeEach(async () => {
    await handle.db.execute(dsql`truncate players, api_cache cascade`);
    fake.forceStatus(null);
  });

  it('guarda las batallas de los jugadores seguidos y no duplica en la siguiente corrida', async () => {
    await services.setTracked('2PP', true);
    const first = await runSync(services, handle.db, quiet, 0);
    expect(first).toMatchObject({ players: 1, newBattles: 12, failed: 0, stoppedEarly: false });

    fake.addBattle('defeat', new Date(Date.now() + 1000));
    const second = await runSync(services, handle.db, quiet, 0);
    expect(second.newBattles).toBe(1);
  });

  it('se detiene si Supercell rechaza la llave', async () => {
    await services.setTracked('2PP', true);
    fake.forceStatus(403);
    const report = await runSync(services, handle.db, quiet, 0);
    expect(report).toMatchObject({ players: 0, failed: 1, stoppedEarly: true });
  });

  it('no hace nada si no hay jugadores seguidos', async () => {
    const report = await runSync(services, handle.db, quiet, 0);
    expect(report).toEqual({ players: 0, newBattles: 0, failed: 0, stoppedEarly: false });
  });
});
