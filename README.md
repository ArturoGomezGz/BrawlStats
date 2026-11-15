# Brawl Stats

Estadísticas de jugadores de Brawl Stars: perfil, brawlers, últimas batallas e historial de los jugadores seguidos.

> Proyecto de fans. No está afiliado, patrocinado ni aprobado por Supercell. Sigue la [Fan Content Policy](https://supercell.com/en/fan-content-policy/) de Supercell.

## Estructura

```
apps/
  web/        Next.js: la página pública (servicio "web" en Railway)
  api/        Fastify: única pieza que habla con la API de Supercell (servicio "api")
packages/
  db/         Esquema Drizzle, migraciones y cliente de Postgres
```

Más adelante: `apps/worker` (cron que guarda el historial) y `packages/brawl-client` (cliente tipado de la API de Supercell).

## Desarrollo local

Requisitos: Node 22 y pnpm 10 (`corepack enable`), y un Postgres local si vas a migrar.

```bash
pnpm install
cp .env.example .env          # ajusta DATABASE_URL
pnpm --filter @brawlstats/db build
pnpm --filter @brawlstats/db db:migrate
pnpm dev                      # web en :3000, api en :4000
```

Comandos útiles: `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm format`.

Para cambiar el esquema: edita `packages/db/src/schema.ts` y corre `pnpm --filter @brawlstats/db db:generate`.

> Si tu máquina no tiene IPv6, arranca la api con `HOST=0.0.0.0`.

## Despliegue en Railway

Proyecto **Brawl Stats** en Railway con los servicios `web`, `api` y `Postgres`. Cada servicio construye desde la raíz del repo (para ver los paquetes compartidos) con estos ajustes:

| Servicio | Build command                            | Start command                         | Pre-deploy                                | Variables                                                      |
| -------- | ---------------------------------------- | ------------------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| `api`    | `pnpm --filter @brawlstats/api... build` | `pnpm --filter @brawlstats/api start` | `pnpm --filter @brawlstats/db db:migrate` | `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `PORT=4000`         |
| `web`    | `pnpm --filter @brawlstats/web... build` | `pnpm --filter @brawlstats/web start` | —                                         | `API_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}` |

Ambos usan healthcheck en `/health` y watch paths a su carpeta de `apps/`, `packages/**` y `pnpm-lock.yaml`. La `api` solo se expone por la red privada; la `web` tiene el dominio público. En el hito 2 se activan las IPs de salida fijas en la `api` para registrar la llave de Supercell (`BRAWL_API_TOKEN`).
