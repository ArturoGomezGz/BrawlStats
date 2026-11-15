import type { z } from 'zod';
import { normalizeTag } from './tag.js';
import {
  battlelogSchema,
  clubSchema,
  playerSchema,
  type Battlelog,
  type Club,
  type Player,
} from './schemas.js';

export type BrawlErrorKind =
  'invalid_tag' | 'not_found' | 'rate_limited' | 'unauthorized' | 'unavailable' | 'bad_response';

export class BrawlApiError extends Error {
  constructor(
    readonly kind: BrawlErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'BrawlApiError';
  }
}

export interface BrawlClientOptions {
  token: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface BrawlClient {
  getPlayer(tag: string): Promise<Player>;
  getBattlelog(tag: string): Promise<Battlelog>;
  getClub(tag: string): Promise<Club>;
}

export function createBrawlClient(options: BrawlClientOptions): BrawlClient {
  const baseUrl = (options.baseUrl ?? 'https://api.brawlstars.com/v1').replace(/\/$/, '');
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8000;

  async function get<S extends z.ZodTypeAny>(path: string, schema: S): Promise<z.infer<S>> {
    let res: Response;
    try {
      res = await doFetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${options.token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new BrawlApiError('unavailable', `No se pudo contactar a Supercell: ${String(err)}`);
    }

    if (res.status === 404) throw new BrawlApiError('not_found', 'No existe ese tag', 404);
    if (res.status === 429)
      throw new BrawlApiError('rate_limited', 'Supercell limitó las peticiones', 429);
    if (res.status === 403 || res.status === 401) {
      throw new BrawlApiError(
        'unauthorized',
        'La llave de Supercell no es válida para esta IP',
        res.status,
      );
    }
    if (!res.ok)
      throw new BrawlApiError('unavailable', `Supercell respondió ${res.status}`, res.status);

    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) {
      throw new BrawlApiError(
        'bad_response',
        `Respuesta inesperada de Supercell: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  }

  const encode = (input: string) => {
    const tag = normalizeTag(input);
    if (!tag) throw new BrawlApiError('invalid_tag', 'Tag inválido');
    return encodeURIComponent(`#${tag}`);
  };

  return {
    getPlayer: async (tag) => get(`/players/${encode(tag)}`, playerSchema),
    getBattlelog: async (tag) => get(`/players/${encode(tag)}/battlelog`, battlelogSchema),
    getClub: async (tag) => get(`/clubs/${encode(tag)}`, clubSchema),
  };
}
