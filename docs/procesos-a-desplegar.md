# SionMarket · Procesos y servicios a desplegar

Versión 1 · 11 oct 2026 · Complementa [propuesta-arquitectura.md](propuesta-arquitectura.md)

Dominio de ejemplo: `sionmarket.com`. Dos entornos: **staging** (pruebas) y **producción**, con la misma receta.

## 1. Servidor de producción (VPS Ubuntu 24.04 con Docker Compose)

Tamaño inicial sugerido: 4 vCPU, 8 GB RAM, 160 GB SSD. Staging puede ir en una VPS de 2 vCPU / 4 GB.

| # | Proceso | Imagen / herramienta | Copias | Expuesto en | Función |
|---|---|---|---|---|---|
| 1 | **nginx** | nginx + certbot (Let's Encrypt) | 1 | 80/443 | HTTPS, HTTP/2, compresión, límite de peticiones, enruta a api y realtime, sirve las webs si no van a CDN |
| 2 | **api** | backend `main-api` | 2 | `api.sionmarket.com` | REST para las 4 apps |
| 3 | **realtime** | backend `main-realtime` (Socket.IO + adaptador Redis) | 1 (escala a 2+) | `ws.sionmarket.com` | Seguimiento, ubicación, chat, bandeja del restaurante, torre de control |
| 4 | **worker** | backend `main-worker` (BullMQ) | 1 (escala a 2+) | interno | Push/SMS, ofertas y reasignación, vencimientos, facturas, conciliación |
| 5 | **scheduler** | dentro del worker (tareas repetitivas de BullMQ) | 1 | interno | Tasa BCV cada hora, cancelar pedidos sin respuesta, cerrar liquidaciones diarias, limpiar datos |
| 6 | **postgres** | Supabase (Postgres administrado + PostGIS en el esquema `extensions`) | 1 | conexión "Session pooler" (5432) | Datos principales en el esquema `sionmarket`; respaldos diarios de Supabase |
| 7 | **redis** | Redis 7 con persistencia AOF | 1 | interno | Caché, colas, GEO de repartidores, pub/sub entre procesos |
| 8 | **migraciones** | tarea única `drizzle-kit migrate` | en cada despliegue | — | Actualiza el esquema antes de levantar la nueva versión |
| 9 | **backups** | Respaldos de Supabase (diarios; recuperación a un punto en el tiempo en el plan Pro) + pg_dump semanal del esquema `sionmarket` a almacenamiento externo | diario | — | Prueba de restauración mensual |
| 10 | **monitoreo** | Uptime Kuma + node-exporter (o Grafana Cloud gratis) | 1 | `status.sionmarket.com` | Alertas si cae el API, el WS o se llena el disco |

Seguridad del servidor: firewall (solo 22, 80, 443), SSH solo con llave, fail2ban, actualizaciones automáticas de seguridad, PostgreSQL y Redis sin puerto público, secretos en archivo `.env` fuera del repo.

## 2. Webs estáticas (CDN)

| # | Sitio | Dominio | Dónde |
|---|---|---|---|
| 11 | **Panel del restaurante** | `restaurantes.sionmarket.com` | Cloudflare Pages (o Nginx) |
| 12 | **Back office** | `admin.sionmarket.com` | Cloudflare Pages con acceso restringido (Cloudflare Access o IP) |
| 13 | **Landing / enlaces de descarga** | `sionmarket.com` | Cloudflare Pages (opcional) |

## 3. Almacenamiento y CDN

| # | Servicio | Uso |
|---|---|---|
| 14 | **Almacenamiento de objetos** (Cloudflare R2 o S3) | Fotos de restaurantes y productos, fotos del chat, comprobantes de Pago Móvil, facturas PDF, backups |
| 15 | **CDN de imágenes** `cdn.sionmarket.com` | Entrega y redimensiona imágenes para móvil |
| 16 | **DNS** (Cloudflare) | Dominios, protección DDoS básica |

## 4. Apps móviles (Expo EAS)

| # | Proceso | Detalle |
|---|---|---|
| 17 | **EAS Build** | Binarios de **app cliente** y **app repartidor**, Android (AAB) e iOS (IPA), perfiles `preview` y `production` |
| 18 | **EAS Submit** | Envío a Google Play Console y App Store Connect |
| 19 | **EAS Update** | Canales `staging` y `production` para corregir JS sin pasar por revisión de tienda |
| 20 | **Cuentas de tienda** | Google Play Developer (pago único 25 USD) y Apple Developer (99 USD/año); repartidor puede ir como prueba interna en Play al inicio |

## 5. Integraciones externas

| # | Servicio | Para qué | Opciones | Estado |
|---|---|---|---|---|
| 21 | **Push** | Estados del pedido, ofertas al repartidor | Expo Push (usa FCM y APNs por debajo) | Configurar llaves FCM y APNs |
| 22 | **SMS / WhatsApp** | OTP (configurado como proveedor de Supabase Auth) y respaldo de avisos | WhatsApp Cloud API (Meta), Twilio | Por elegir |
| 23 | **Mapas** | Pin de dirección, geocodificación, rutas y ETA | Google Maps Platform o Mapbox | Por elegir |
| 24 | **Tasa de cambio** | Bs/USD oficial | Tasa BCV (consulta programada) | — |
| 25 | **Pagos** | Pago Móvil, transferencia, tarjeta | Verificación con API del banco o conciliación manual en back office al inicio; pasarela local para tarjeta | Por elegir banco |
| 26 | **Facturación** | Factura del delivery de SionMarket | Imprenta digital autorizada por el SENIAT | Por elegir |
| 27 | **Login social** | Google y Apple | Google Identity, Sign in with Apple | Configurar |
| 28 | **Errores y rendimiento** | Ver fallos en apps y backend | Sentry (plan gratis) | Configurar |
| 29 | **Llamada enmascarada** | Cliente ↔ repartidor sin ver el número | Twilio Proxy | Posterior al MVP |

## 6. CI/CD (GitHub Actions)

| # | Flujo | Cuándo | Qué hace |
|---|---|---|---|
| 30 | **ci** | Cada PR | Instala, lint, typecheck, pruebas, build de lo que cambió (Turborepo) |
| 31 | **deploy-backend** | Merge a `main` → staging; tag `v*` → producción | Construye imagen Docker, la publica en GHCR, entra por SSH, corre migraciones, `docker compose up -d` sin caída |
| 32 | **deploy-webs** | Merge a `main` | Publica panel y back office en Cloudflare Pages |
| 33 | **mobile** | Tag o manual | `eas update` al canal; `eas build` + `eas submit` cuando cambian módulos nativos |

## 7. Checklist para declarar «en producción»

- [ ] Repositorio en GitHub con el monorepo y los 4 flujos de CI/CD.
- [ ] Dominio comprado y DNS en Cloudflare.
- [ ] VPS de staging y de producción con los procesos 1–10 levantados y HTTPS válido.
- [ ] Panel del restaurante y back office publicados.
- [ ] R2/S3 y CDN de imágenes configurados.
- [ ] Llaves de FCM, APNs, mapas, SMS/WhatsApp, Sentry cargadas como secretos.
- [ ] App cliente y app repartidor en Play (prueba interna → producción) y TestFlight → App Store.
- [ ] Backup restaurado con éxito al menos una vez.
- [ ] Alertas de caída llegando al teléfono del equipo.
- [ ] Pedido de punta a punta probado en staging: cliente pide → restaurante acepta → asignación → repartidor retira con PIN → entrega → calificación → factura del delivery.

## Costo mensual aproximado del arranque

| Concepto | USD/mes |
|---|---|
| VPS producción (4 vCPU / 8 GB) | 20–40 |
| VPS staging (2 vCPU / 4 GB) | 10–20 |
| Cloudflare (DNS, Pages, R2 con poco uso) | 0–5 |
| Expo EAS (plan gratis al inicio; Production 99 si se necesitan más builds) | 0–99 |
| Apple Developer (99/año) | ~8 |
| Mapas, SMS/WhatsApp | según uso |

Estimado, sin contar mapas ni mensajes, que dependen del volumen de pedidos.
