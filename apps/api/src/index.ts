import { createBrawlClient } from '@brawlstats/brawl-client';
import { createServices } from '@brawlstats/core';
import { createDb } from '@brawlstats/db';
import { createDraftAnalyzer } from './ai.js';
import { buildServer } from './server.js';

const port = Number(process.env.PORT ?? 4000);
// '::' escucha en IPv4 e IPv6; la red privada de Railway usa IPv6.
const host = process.env.HOST ?? '::';

const { db, sql } = createDb();
const client = createBrawlClient({
  token: process.env.BRAWL_API_TOKEN ?? '',
  baseUrl: process.env.BRAWL_API_BASE_URL,
});
const analyzer = process.env.ANTHROPIC_API_KEY
  ? createDraftAnalyzer({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || undefined,
    })
  : undefined;
const app = buildServer(createServices(db, client), { logger: true }, { analyzer });

if (!process.env.BRAWL_API_TOKEN) {
  app.log.warn('BRAWL_API_TOKEN no está definida: las consultas a Supercell van a fallar');
}

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app
      .close()
      .then(() => sql.end())
      .then(() => process.exit(0));
  });
}
