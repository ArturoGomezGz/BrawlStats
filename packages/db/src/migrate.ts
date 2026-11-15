import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDb } from './client.js';

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

const { db, sql } = createDb();
await migrate(db, { migrationsFolder });
await sql.end();
console.log('Migraciones aplicadas');
