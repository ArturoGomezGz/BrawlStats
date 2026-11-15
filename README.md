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

Un proyecto con los servicios `web`, `api` y `Postgres`, y los entornos `testing` y `production`. Cada servicio usa la raíz del repo (para ver los paquetes compartidos) y su propio archivo de configuración:

| Servicio | Config file path         | Variables                                                                          |
| -------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `api`    | `/apps/api/railway.json` | `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `PORT=4000`, `BRAWL_API_TOKEN` (hito 2) |
| `web`    | `/apps/web/railway.json` | `API_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}`                     |

La `api` corre las migraciones antes de cada despliegue (`preDeployCommand`) y solo se expone por la red privada. La `web` tiene el dominio público. En el hito 2 se activan las IPs de salida fijas en la `api` para registrar la llave de Supercell.
