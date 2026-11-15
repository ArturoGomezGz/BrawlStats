import Fastify, { type FastifyServerOptions } from 'fastify';
import { BrawlApiError, type ApiErrorBody, type BrawlErrorKind } from '@brawlstats/brawl-client';
import type { Services } from '@brawlstats/core';
import { KNOWN_BRAWLERS, suggestFor, type DraftState } from '@brawlstats/draft';
import { AiError, analyzeBodySchema, type DraftAnalyzer } from './ai.js';

const STATUS: Record<BrawlErrorKind, number> = {
  invalid_tag: 400,
  not_found: 404,
  rate_limited: 503,
  unauthorized: 502,
  unavailable: 502,
  bad_response: 502,
};

export interface ServerDeps {
  /** Si falta, `/draft/analyze` responde `ai_disabled`. */
  analyzer?: DraftAnalyzer;
}

export function buildServer(
  services: Services,
  opts: FastifyServerOptions = {},
  deps: ServerDeps = {},
) {
  const app = Fastify(opts);

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof BrawlApiError) {
      if (err.kind === 'unauthorized' || err.kind === 'bad_response') req.log.error(err);
      const body: ApiErrorBody = { error: err.kind, message: err.message };
      return reply.status(STATUS[err.kind]).send(body);
    }
    if (err instanceof AiError) {
      req.log.error(err);
      const body: ApiErrorBody = { error: 'ai_failed', message: 'La IA no pudo responder ahora' };
      return reply.status(502).send(body);
    }
    req.log.error(err);
    const body: ApiErrorBody = { error: 'internal', message: 'Error interno' };
    return reply.status(500).send(body);
  });

  app.get('/health', async () => ({ status: 'ok', service: 'api' }));

  app.get('/health/ai', async () => ({ enabled: !!deps.analyzer }));

  /** Lista de brawlers; si Supercell no responde, la de respaldo de las plantillas. */
  async function loadRoster(): Promise<{ brawlers: string[] }> {
    try {
      return await services.getBrawlers();
    } catch (err) {
      app.log.warn(err);
      return { brawlers: KNOWN_BRAWLERS };
    }
  }

  app.get('/brawlers', loadRoster);

  app.post('/draft/analyze', async (req, reply) => {
    if (!deps.analyzer) {
      const body: ApiErrorBody = { error: 'ai_disabled', message: 'La IA no está configurada' };
      return reply.status(503).send(body);
    }
    const parsed = analyzeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      const body: ApiErrorBody = { error: 'invalid_request', message: 'Draft inválido' };
      return reply.status(400).send(body);
    }
    const { brawlers } = await loadRoster();
    const state = parsed.data.state as DraftState;
    const { step } = parsed.data;
    const candidates = suggestFor(state, step, {
      roster: brawlers,
      pool: parsed.data.pool,
      limit: 10,
    });
    if (candidates.length === 0) {
      const body: ApiErrorBody = { error: 'invalid_request', message: 'El draft ya terminó' };
      return reply.status(400).send(body);
    }
    return deps.analyzer.analyze(state, step, candidates);
  });

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
