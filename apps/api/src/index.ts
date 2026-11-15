import { buildServer } from './server.js';

const port = Number(process.env.PORT ?? 4000);
// '::' escucha en IPv4 e IPv6; la red privada de Railway usa IPv6.
const host = process.env.HOST ?? '::';

const app = buildServer({ logger: true });

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
