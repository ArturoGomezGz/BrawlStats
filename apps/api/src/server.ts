import Fastify, { type FastifyServerOptions } from 'fastify';
import { BrawlApiError, type ApiErrorBody, type BrawlErrorKind } from '@brawlstats/brawl-client';
import type { Services } from '@brawlstats/core';

const STATUS: Record<BrawlErrorKind, number> = {
  invalid_tag: 400,
  not_found: 404,
  rate_limited: 503,
  unauthorized: 502,
  unavailable: 502,
  bad_response: 502,
};

export function buildServer(services: Services, opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof BrawlApiError) {
      if (err.kind === 'unauthorized' || err.kind === 'bad_response') req.log.error(err);
      const body: ApiErrorBody = { error: err.kind, message: err.message };
      return reply.status(STATUS[err.kind]).send(body);
    }
    req.log.error(err);
    const body: ApiErrorBody = { error: 'internal', message: 'Error interno' };
    return reply.status(500).send(body);
  });

  app.get('/health', async () => ({ status: 'ok', service: 'api' }));

  type TagParams = { Params: { tag: string } };

  app.get<TagParams>('/players/:tag', ({ params }) => services.getPlayer(params.tag));
  app.get<TagParams>('/players/:tag/battlelog', ({ params }) => services.getBattlelog(params.tag));
  app.get<TagParams>('/players/:tag/history', ({ params }) => services.getHistory(params.tag));
  app.get<TagParams>('/clubs/:tag', ({ params }) => services.getClub(params.tag));

  app.put<TagParams>('/players/:tag/follow', async ({ params }) => {
    await services.setTracked(params.tag, true);
    // Guarda de inmediato lo que haya, para que la gráfica no empiece vacía.
    const { newBattles } = await services.syncPlayer(params.tag);
    return { tracked: true, newBattles };
  });

  app.delete<TagParams>('/players/:tag/follow', async ({ params }) => {
    await services.setTracked(params.tag, false);
    return { tracked: false };
  });

  return app;
}
