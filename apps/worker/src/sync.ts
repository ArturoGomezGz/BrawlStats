import { BrawlApiError } from '@brawlstats/brawl-client';
import { purgeCache, type Services } from '@brawlstats/core';
import type { Db } from '@brawlstats/db';

export interface SyncReport {
  players: number;
  newBattles: number;
  failed: number;
  stoppedEarly: boolean;
}

interface Logger {
  info(msg: string): void;
  error(msg: string): void;
}

/**
 * Sincroniza a los jugadores seguidos, de uno en uno para respetar el límite de Supercell.
 * Si Supercell limita las peticiones o rechaza la llave, se detiene: seguir solo empeora el límite.
 */
export async function runSync(
  services: Services,
  db: Db,
  log: Logger = console,
  delayMs = 200,
): Promise<SyncReport> {
  const tags = await services.listPlayersToSync();
  const report: SyncReport = { players: 0, newBattles: 0, failed: 0, stoppedEarly: false };

  for (const tag of tags) {
    try {
      const { newBattles } = await services.syncPlayer(tag);
      report.players += 1;
      report.newBattles += newBattles;
    } catch (err) {
      report.failed += 1;
      log.error(`No se pudo sincronizar #${tag}: ${String(err)}`);
      if (
        err instanceof BrawlApiError &&
        (err.kind === 'rate_limited' || err.kind === 'unauthorized')
      ) {
        report.stoppedEarly = true;
        break;
      }
    }
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  await purgeCache(db);
  log.info(
    `Sincronización: ${report.players}/${tags.length} jugadores, ${report.newBattles} batallas nuevas, ${report.failed} fallos`,
  );
  return report;
}
