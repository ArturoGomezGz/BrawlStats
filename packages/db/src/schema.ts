import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/** Jugadores consultados o seguidos. El tag se guarda normalizado (sin '#', en mayúsculas). */
export const players = pgTable('players', {
  tag: text('tag').primaryKey(),
  name: text('name').notNull(),
  trophies: integer('trophies').notNull(),
  /** Si es true, el worker guarda sus batallas nuevas periódicamente. */
  tracked: boolean('tracked').notNull().default(false),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Batallas guardadas de jugadores seguidos. (playerTag, battleTime) evita duplicados entre sincronizaciones. */
export const battles = pgTable(
  'battles',
  {
    playerTag: text('player_tag')
      .notNull()
      .references(() => players.tag, { onDelete: 'cascade' }),
    battleTime: timestamp('battle_time', { withTimezone: true }).notNull(),
    mode: text('mode'),
    map: text('map'),
    brawler: text('brawler'),
    result: text('result'),
    trophyChange: integer('trophy_change'),
    raw: jsonb('raw').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.playerTag, t.battleTime] }),
    index('battles_player_time_idx').on(t.playerTag, sql`${t.battleTime} desc`),
  ],
);

/** Trofeos de un jugador seguido en cada sincronización, para la gráfica de trofeos en el tiempo. */
export const playerSnapshots = pgTable(
  'player_snapshots',
  {
    playerTag: text('player_tag')
      .notNull()
      .references(() => players.tag, { onDelete: 'cascade' }),
    takenAt: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),
    trophies: integer('trophies').notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerTag, t.takenAt] })],
);

/** Caché de respuestas de la API de Supercell para no repetir peticiones. */
export const apiCache = pgTable('api_cache', {
  key: text('key').primaryKey(),
  body: jsonb('body').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
