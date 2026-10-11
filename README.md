# SionMarket

Monorepo de la plataforma de delivery SionMarket. Arquitectura y despliegue: ver `docs/`.

```
apps/
  backend/        NestJS + Fastify, PostgreSQL + PostGIS (Drizzle), Redis. Tres procesos: api, realtime, worker
  cliente/        App Expo del consumidor (Android, iOS y web)
packages/
  contracts/      Tipos y validaciones compartidas (Zod): estados del pedido, montos, eventos en tiempo real
infra/            Docker Compose de desarrollo y de producción, Nginx
sionmarket-web/   Web de pre-lanzamiento (estática, Supabase, Vercel). No forma parte del workspace.
```

## Procesos del backend

| Proceso | Comando | Puerto | Hace |
|---|---|---|---|
| api | `node dist/main-api.js` | 3000 | REST `/v1`, valida y guarda; cada cambio escribe un evento en `outbox_events` |
| realtime | `node dist/main-realtime.js` | 3001 | Socket.IO en `/ws`: estado del pedido, bandeja del restaurante, ubicación del repartidor |
| worker | `node dist/main-worker.js` | — | Lee el outbox (LISTEN/NOTIFY), publica en Redis para realtime, encola push y temporizadores (BullMQ) |

Si el restaurante no acepta en `ACCEPT_TIMEOUT_MIN` minutos (10 por defecto), el worker rechaza el pedido.
El catálogo se sirve desde Redis y se invalida cuando el restaurante cambia su menú.

## Correrlo en tu PC (Windows, macOS o Linux)

Necesitas Node 22, pnpm (`corepack enable`) y Docker Desktop.

```bash
pnpm install
pnpm db:up                         # levanta PostgreSQL + PostGIS y Redis
cp apps/backend/.env.example apps/backend/.env
pnpm build
pnpm --filter @sionmarket/backend db:migrate
pnpm --filter @sionmarket/backend db:seed
pnpm --filter @sionmarket/backend start                    # api      http://localhost:3000/v1/salud
node --env-file=apps/backend/.env apps/backend/dist/main-realtime.js   # realtime :3001
node --env-file=apps/backend/.env apps/backend/dist/main-worker.js     # worker
```

### App cliente contra el API

Copia `apps/cliente/.env.example` a `apps/cliente/.env` con la IP de tu PC en la red local y corre
`pnpm --filter @sionmarket/cliente start`. Sin ese archivo la app sigue en modo demo con los datos de prueba.

Pruebas de punta a punta (usan la base `sionmarket_test`): `pnpm test`.

## Cuentas demo

En desarrollo todos los códigos OTP son `123456` (variable `OTP_DEV_CODE`).

| Rol | Teléfono |
|---|---|
| Admin | +584120000009 |
| Restaurante (dueño de los 5 demo) | +584120000001 |
| Repartidor | +584120000002 |
| Cliente | cualquier otro +58… |

## Endpoints (prefijo `/v1`)

| Método | Ruta | Quién | Para qué |
|---|---|---|---|
| POST | `/auth/otp` · `/auth/otp/verificar` · `/auth/refresh` · `/auth/logout` | todos | Sesión por teléfono |
| GET/PATCH | `/yo` | sesión | Perfil |
| GET/POST/DELETE | `/yo/direcciones` | sesión | Direcciones (valida cobertura) |
| POST | `/cobertura/verificar` · `/cobertura/avisame` | público / sesión | Zona de cobertura y lista de espera |
| GET | `/categorias` · `/restaurantes` · `/restaurantes/:id` | público | Catálogo, búsqueda, filtros, menú |
| PATCH | `/restaurantes/:id/abierto` · `/restaurantes/:id/productos/:pid/disponibilidad` | restaurante | Abrir/cerrar, agotados |
| GET | `/tasa` | público | Tasa Bs/USD vigente |
| POST | `/cotizar` | cliente | Total calculado por el servidor |
| POST/GET | `/pedidos` · `/pedidos/:id` | cliente | Crear y ver pedidos |
| POST | `/pedidos/:id/estado` | cliente, restaurante, repartidor, admin | Mover el pedido según la máquina de estados |
| POST | `/pedidos/:id/asignar` | admin | Asignación manual (el motor llega en el paso 3) |
| POST | `/yo/dispositivos` | sesión | Registrar el token de push de Expo |
| GET | `/restaurantes/:id/pedidos?estado=PENDIENTE,ACEPTADO` | restaurante | Bandeja del panel |

## Reglas que viven en el servidor

- Montos en centavos de USD; bolívares con la tasa guardada en cada pedido.
- La comida la factura el restaurante y el delivery + propina SionMarket; los dos montos van separados.
- Modificadores: obligatorios, mínimos y máximos se validan al cotizar y al crear.
- Estados: `packages/contracts/src/order-status.ts` define quién puede mover cada transición.
- Retiro: el repartidor necesita el PIN de 4 dígitos que ve el restaurante.
- Cada cambio de estado queda en `order_status_events` y genera un evento en `outbox_events` que el worker entrega.

## Despliegue

- **Backend**: `infra/docker-compose.prod.yml` en una VPS (api ×2, realtime, worker, migraciones, PostgreSQL + PostGIS, Redis, Nginx con HTTPS).
- **App cliente web**: proyecto de Vercel con *Root Directory* `apps/cliente` (usa `apps/cliente/vercel.json`).
- **App cliente Android/iOS**: EAS Build y EAS Update.
- **Web de pre-lanzamiento**: sigue igual en `sionmarket-web/`.
