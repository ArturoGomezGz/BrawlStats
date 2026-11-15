import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';
import { battles, playerSnapshots, players, type Db } from '@brawlstats/db';
import {
  BrawlApiError,
  normalizeTag,
  summarizeBattle,
  type BattlelogResponse,
  type BrawlClient,
  type Club,
  type HistoryResponse,
  type PlayerResponse,
} from '@brawlstats/brawl-client';
import { cached } from './cache.js';

const MINUTE = 60_000;
const PLAYER_TTL = 1 * MINUTE;
const BATTLELOG_TTL = 1 * MINUTE;
const CLUB_TTL = 5 * MINUTE;
/** Un jugador seguido se sigue sincronizando mientras alguien lo haya consultado en este plazo. */
const ACTIVE_DAYS = 14;

function tagOrThrow(input: string): string {
  const tag = normalizeTag(input);
  if (!tag) throw new BrawlApiError('invalid_tag', 'Tag inválido');
  return tag;
}

function winRate(results: (string | null)[]): number | null {
  const wins = results.filter((r) => r === 'victory').length;
  const losses = results.filter((r) => r === 'defeat').length;
  return wins + losses === 0 ? null : wins / (wins + losses);
}

export function createServices(db: Db, client: BrawlClient) {
  async function loadPlayer(tag: string) {
    return cached(db, `player:${tag}`, PLAYER_TTL, () => client.getPlayer(tag));
  }

  async function loadBattlelog(tag: string) {
    return cached(db, `battlelog:${tag}`, BATTLELOG_TTL, () => client.getBattlelog(tag));
  }

  return {
    async getPlayer(input: string): Promise<PlayerResponse> {
      const tag = tagOrThrow(input);
      const player = await loadPlayer(tag);
      const now = new Date();
      const [row] = await db
        .insert(players)
        .values({ tag, name: player.name, trophies: player.trophies, lastViewedAt: now })
        .onConflictDoUpdate({
          target: players.tag,
          set: { name: player.name, trophies: player.trophies, lastViewedAt: now },
        })
        .returning({ tracked: players.tracked });
      return { ...player, tracked: row?.tracked ?? false };
    },

    async getBattlelog(input: string): Promise<BattlelogResponse> {
      const tag = tagOrThrow(input);
      const log = await loadBattlelog(tag);
      const list = log.items.map((item) => summarizeBattle(item, tag));
      return { battles: list, winRate: winRate(list.map((b) => b.result)) };
    },

    async getClub(input: string): Promise<Club> {
      const tag = tagOrThrow(input);
      return cached(db, `club:${tag}`, CLUB_TTL, () => client.getClub(tag));
    },

    /** Trae el perfil y el battlelog frescos y guarda las batallas nuevas y los trofeos de hoy. */
    async syncPlayer(input: string): Promise<{ newBattles: number }> {
      const tag = tagOrThrow(input);
      const [player, log] = await Promise.all([client.getPlayer(tag), client.getBattlelog(tag)]);
      const now = new Date();

      await db
        .insert(players)
        .values({ tag, name: player.name, trophies: player.trophies })
        .onConflictDoUpdate({
          target: players.tag,
          set: { name: player.name, trophies: player.trophies },
        });

      const rows = log.items.map((item) => {
        const s = summarizeBattle(item, tag);
        return {
          playerTag: tag,
          battleTime: new Date(s.battleTime),
          mode: s.mode,
          map: s.map,
          brawler: s.brawler,
          result: s.result,
          trophyChange: s.trophyChange,
          raw: item,
        };
      });

      let newBattles = 0;
      if (rows.length > 0) {
        const inserted = await db
          .insert(battles)
          .values(rows)
          .onConflictDoNothing()
          .returning({ battleTime: battles.battleTime });
        newBattles = inserted.length;
      }

      await db
        .insert(playerSnapshots)
        .values({ playerTag: tag, takenAt: now, trophies: player.trophies });
      await db.update(players).set({ lastSyncedAt: now }).where(eq(players.tag, tag));
      return { newBattles };
    },

    async setTracked(input: string, tracked: boolean): Promise<void> {
      const tag = tagOrThrow(input);
      if (tracked) {
        // Comprueba que el jugador existe antes de seguirlo y lo registra.
        const player = await client.getPlayer(tag);
        await db
          .insert(players)
          .values({
            tag,
            name: player.name,
            trophies: player.trophies,
            tracked: true,
            lastViewedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: players.tag,
            set: { tracked: true, lastViewedAt: new Date() },
          });
      } else {
        await db.update(players).set({ tracked: false }).where(eq(players.tag, tag));
      }
    },

    async getHistory(input: string): Promise<HistoryResponse> {
      const tag = tagOrThrow(input);
      const [player] = await db.select().from(players).where(eq(players.tag, tag)).limit(1);
      const since = new Date(Date.now() - 30 * 24 * 60 * MINUTE);

      const snapshots = await db
        .select({ takenAt: playerSnapshots.takenAt, trophies: playerSnapshots.trophies })
        .from(playerSnapshots)
        .where(eq(playerSnapshots.playerTag, tag))
        .orderBy(desc(playerSnapshots.takenAt))
        .limit(200);

      const recent = await db
        .select({ battleTime: battles.battleTime, result: battles.result })
        .from(battles)
        .where(and(eq(battles.playerTag, tag), gte(battles.battleTime, since)))
        .orderBy(asc(battles.battleTime));

      const [{ total } = { total: 0 }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(battles)
        .where(eq(battles.playerTag, tag));

      const byDay = new Map<string, { wins: number; losses: number }>();
      for (const b of recent) {
        const date = b.battleTime.toISOString().slice(0, 10);
        const day = byDay.get(date) ?? { wins: 0, losses: 0 };
        if (b.result === 'victory') day.wins += 1;
        if (b.result === 'defeat') day.losses += 1;
        byDay.set(date, day);
      }

      return {
        tracked: player?.tracked ?? false,
        totalBattles: total,
        trophies: snapshots
          .reverse()
          .map((s) => ({ takenAt: s.takenAt.toISOString(), trophies: s.trophies })),
        daily: [...byDay.entries()].map(([date, d]) => ({ date, ...d })),
      };
    },

    /** Jugadores seguidos que alguien consultó hace poco, los menos sincronizados primero. */
    async listPlayersToSync(): Promise<string[]> {
      const cutoff = new Date(Date.now() - ACTIVE_DAYS * 24 * 60 * MINUTE);
      const rows = await db
        .select({ tag: players.tag })
        .from(players)
        .where(and(eq(players.tracked, true), gte(players.lastViewedAt, cutoff)))
        .orderBy(sql`${players.lastSyncedAt} asc nulls first`);
      return rows.map((r) => r.tag);
    },
  };
}

export type Services = ReturnType<typeof createServices>;
