import { createBrawlClient } from '@brawlstats/brawl-client';
import { createServices } from '@brawlstats/core';
import { createDb } from '@brawlstats/db';
import { runSync } from './sync.js';

// Corre una vez y termina: Railway lo lanza con su cron.
const { db, sql } = createDb();
const client = createBrawlClient({
  token: process.env.BRAWL_API_TOKEN ?? '',
  baseUrl: process.env.BRAWL_API_BASE_URL,
});

let exitCode = 0;
try {
  const report = await runSync(createServices(db, client), db);
  if (report.stoppedEarly) exitCode = 1;
} catch (err) {
  console.error(err);
  exitCode = 1;
} finally {
  await sql.end();
}
process.exit(exitCode);
