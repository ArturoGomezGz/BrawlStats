import { and, eq, lt } from 'drizzle-orm';
import { apiCache, type Db } from '@brawlstats/db';
import { BrawlApiError } from '@brawlstats/brawl-client';

/**
 * Devuelve el valor guardado si sigue vigente; si no, lo pide con `load` y lo guarda.
 * Si Supercell no responde (límite de peticiones o caída) y hay una copia vencida, la usa.
 */
export async function cached<T>(
  db: Db,
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const [row] = await db.select().from(apiCache).where(eq(apiCache.key, key)).limit(1);
  if (row && row.expiresAt.getTime() > Date.now()) return row.body as T;

  let value: T;
  try {
    value = await load();
  } catch (err) {
    const recoverable =
      err instanceof BrawlApiError && (err.kind === 'rate_limited' || err.kind === 'unavailable');
    if (row && recoverable) return row.body as T;
    throw err;
  }

  const expiresAt = new Date(Date.now() + ttlMs);
  await db
    .insert(apiCache)
    .values({ key, body: value, expiresAt })
    .onConflictDoUpdate({ target: apiCache.key, set: { body: value, expiresAt } });
  return value;
}

/** Borra las copias que vencieron hace más de un día. */
export async function purgeCache(db: Db): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await db.delete(apiCache).where(and(lt(apiCache.expiresAt, cutoff)));
}
