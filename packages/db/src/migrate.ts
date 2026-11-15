import { createDb } from './client.js';
import { runMigrations } from './migrations.js';

const { db, sql } = createDb();
await runMigrations(db);
await sql.end();
console.log('Migraciones aplicadas');
