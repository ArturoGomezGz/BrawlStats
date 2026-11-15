import { z } from 'zod';

/**
 * Los esquemas validan solo lo que usa la app y dejan pasar el resto (`passthrough`),
 * porque Supercell agrega campos sin avisar.
 */

export const brawlerStatSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    power: z.number(),
    rank: z.number().optional(),
    trophies: z.number(),
    highestTrophies: z.number().optional(),
  })
  .passthrough();

export const playerSchema = z
  .object({
    tag: z.string(),
    name: z.string(),
    nameColor: z.string().optional(),
    icon: z.object({ id: z.number() }).optional(),
    trophies: z.number(),
    highestTrophies: z.number(),
    expLevel: z.number(),
    '3vs3Victories': z.number().optional(),
    soloVictories: z.number().optional(),
    duoVictories: z.number().optional(),
    club: z.object({ tag: z.string(), name: z.string() }).partial().optional(),
    brawlers: z.array(brawlerStatSchema).default([]),
  })
  .passthrough();

const battlePlayerSchema = z
  .object({
    tag: z.string(),
    name: z.string(),
    brawler: z.object({ id: z.number(), name: z.string() }).passthrough().optional(),
  })
  .passthrough();

export const battleItemSchema = z
  .object({
    battleTime: z.string(),
    event: z
      .object({
        id: z.number().optional(),
        mode: z.string().optional().nullable(),
        map: z.string().optional().nullable(),
      })
      .passthrough()
      .default({}),
    battle: z
      .object({
        mode: z.string().optional(),
        type: z.string().optional(),
        result: z.string().optional(),
        rank: z.number().optional(),
        duration: z.number().optional(),
        trophyChange: z.number().optional(),
        starPlayer: battlePlayerSchema.nullable().optional(),
        teams: z.array(z.array(battlePlayerSchema)).optional(),
        players: z.array(battlePlayerSchema).optional(),
      })
      .passthrough()
      .default({}),
  })
  .passthrough();

export const battlelogSchema = z.object({ items: z.array(battleItemSchema) }).passthrough();

export const clubMemberSchema = z
  .object({
    tag: z.string(),
    name: z.string(),
    role: z.string(),
    trophies: z.number(),
  })
  .passthrough();

export const clubSchema = z
  .object({
    tag: z.string(),
    name: z.string(),
    description: z.string().optional(),
    type: z.string().optional(),
    requiredTrophies: z.number().optional(),
    trophies: z.number(),
    members: z.array(clubMemberSchema).default([]),
  })
  .passthrough();

export type Player = z.infer<typeof playerSchema>;
export type BattleItem = z.infer<typeof battleItemSchema>;
export type Battlelog = z.infer<typeof battlelogSchema>;
export type Club = z.infer<typeof clubSchema>;
