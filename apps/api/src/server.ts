import Fastify, { type FastifyServerOptions } from 'fastify';

export function buildServer(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);

  app.get('/health', async () => ({ status: 'ok', service: 'api' }));

  return app;
}
