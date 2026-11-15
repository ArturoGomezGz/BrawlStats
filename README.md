# Brawl Stats

Estadísticas de jugadores de Brawl Stars: perfil, brawlers, últimas batallas e historial de los jugadores seguidos.

> Proyecto de fans. No está afiliado, patrocinado ni aprobado por Supercell. Sigue la [Fan Content Policy](https://supercell.com/en/fan-content-policy/) de Supercell.

## Estructura

```
apps/
  web/            Next.js: la página pública (servicio "web" en Railway)
  api/            Fastify: única pieza que habla con la API de Supercell (servicio "api")
  worker/         Se ejecuta una vez y termina: guarda batallas y trofeos de los jugadores seguidos (cron)
packages/
  brawl-client/   Cliente tipado de la API de Supercell (Zod), tipos de las respuestas y servidor simulado
  draft/          Simulador de draft: formato, estado, plantillas por modo y motor de sugerencias (sin red)
  core/           Caché y lógica compartida por api y worker (consultar, seguir, sincronizar, historial)
  db/             Esquema Drizzle, migraciones y cliente de Postgres
```

## Cómo funciona

- La `web` solo habla con la `api`; la `api` es la única que usa la llave de Supercell.
- Cada respuesta de Supercell se guarda 1 a 5 minutos en la tabla `api_cache`. Si Supercell limita las peticiones o se cae, se sirve la copia vencida.
- Al **seguir** a un jugador se guardan de inmediato sus últimas batallas y sus trofeos. El `worker` repite esto cada 30 minutos para los seguidos que alguien consultó en los últimos 14 días. Las batallas se identifican por jugador y hora, así que no se duplican.
- Se guarda el historial porque Supercell solo devuelve las últimas 25 batallas.

## Simulador de draft (`/draft`)

- El formato (3 bans por equipo alternados y picks 1-2-2-1) vive en `packages/draft/src/format.ts`.
- Las sugerencias salen de las **plantillas** de `packages/draft/src/data/templates.ts` (niveles por modo, sinergias, counters, ajustes por mapa) y los roles de `data/roles.ts`. Son una estimación del meta: edítalas cuando cambie el juego. El motor corre en el navegador, sin IA ni red.
- **Opinión de IA** (opcional): si el servicio `api` tiene `ANTHROPIC_API_KEY`, el botón manda el draft y los mejores candidatos a Claude, que los reordena y explica. Sin la llave el botón queda desactivado. `ANTHROPIC_MODEL` cambia el modelo.
- La lista de brawlers viene de Supercell (`GET /brawlers`, caché de un día); si falla se usa la lista de las plantillas.

## Desarrollo local

Requisitos: Node 22 y pnpm 10 (`corepack enable`) y un Postgres local.

```bash
pnpm install
cp .env.example .env                 # ajusta DATABASE_URL
pnpm --filter @brawlstats/db build
pnpm --filter @brawlstats/db db:migrate
pnpm build
```

Sin llave de Supercell puedes usar el servidor simulado (jugadores `#2PP` y `#8Q0`, club `#YQ2`):

```bash
node packages/brawl-client/dist/fake-server.js        # puerto 4100
BRAWL_API_BASE_URL=http://127.0.0.1:4100/v1 BRAWL_API_TOKEN=x pnpm --filter @brawlstats/api start
pnpm --filter @brawlstats/web start                    # web en :3000
```

Con una llave real, deja `BRAWL_API_BASE_URL` vacía y pon `BRAWL_API_TOKEN`. La llave solo funciona desde las IPs con las que se creó en developer.brawlstars.com.

Comandos útiles: `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm format`. Las pruebas de la api y del worker usan Postgres real y se omiten si no hay `DATABASE_URL`.

Para cambiar el esquema: edita `packages/db/src/schema.ts` y corre `pnpm --filter @brawlstats/db db:generate`.

> Si tu máquina no tiene IPv6, arranca la api con `HOST=0.0.0.0`.

## Despliegue en Railway

Proyecto **Brawl Stats** en Railway con los servicios `web`, `api`, `worker` y `Postgres`. Cada servicio construye desde la raíz del repo (para ver los paquetes compartidos) con estos ajustes:

| Servicio | Build command                               | Start command                            | Pre-deploy                                | Variables                                                                                               |
| -------- | ------------------------------------------- | ---------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `api`    | `pnpm --filter @brawlstats/api... build`    | `pnpm --filter @brawlstats/api start`    | `pnpm --filter @brawlstats/db db:migrate` | `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `PORT=4000`, `BRAWL_API_TOKEN`, opcional `ANTHROPIC_API_KEY` |
| `web`    | `pnpm --filter @brawlstats/web... build`    | `pnpm --filter @brawlstats/web start`    | —                                         | `API_URL=http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}`                                          |
| `worker` | `pnpm --filter @brawlstats/worker... build` | `pnpm --filter @brawlstats/worker start` | —                                         | `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `BRAWL_API_TOKEN`; cron `*/30 * * * *` (cada 30 minutos)     |

`api` y `web` usan healthcheck en `/health`. Los tres tienen watch paths a su carpeta de `apps/`, `packages/**` y `pnpm-lock.yaml`. La `api` solo se expone por la red privada; la `web` tiene el dominio público.

### IPs fijas y llave de Supercell

La llave de developer.brawlstars.com solo funciona desde las IPs con las que se creó. En Railway (plan Pro) activa **Static outbound IP** en los servicios `api` y `worker` (Settings → Networking), crea la llave con esas IPs y guárdala como `BRAWL_API_TOKEN` en ambos servicios.
