# Publicar el backend de SionMarket

El backend (API, tiempo real y worker) corre en un servidor con Docker. La base de datos y el login
son tu proyecto de Supabase. Cuando termines, la web (`/app`) y la app del teléfono dejan el modo demo
y empiezan a crear pedidos reales.

```
teléfono / web ──HTTPS──► api.tudominio.com (nginx) ──► api ×2 · realtime · worker ──► Redis (en el servidor)
                                                                      └──────────────► Supabase (Postgres + Auth)
```

Tiempo estimado: una hora la primera vez. Después, cada cambio que se una a `main` se publica solo.

## 1. Contratar el servidor

- **Sistema:** Ubuntu 24.04.
- **Tamaño para el piloto:** 2 vCPU y 4 GB de RAM (Hetzner CPX21, DigitalOcean o Vultr).
- **Región:** la misma de tu proyecto de Supabase (Supabase → Project Settings → General → Region).
  Así cada consulta a la base tarda milisegundos y no cruza el continente.

## 2. Apuntar el dominio

En tu proveedor de DNS crea un registro **A**: `api.tudominio.com` → IP del servidor.

## 3. Preparar el servidor (una sola vez)

Entra por SSH como `root` y ejecuta:

```bash
curl -fsSL https://get.docker.com | sh
adduser --disabled-password --gecos "" deploy && usermod -aG docker deploy
mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/ && chown -R deploy /home/deploy/.ssh
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
mkdir -p /opt/sionmarket /var/www/certbot && chown deploy /opt/sionmarket
```

## 4. Subir la configuración

Desde tu PC, con el repositorio clonado:

```bash
scp infra/docker-compose.prod.yml deploy@IP:/opt/sionmarket/docker-compose.yml
scp -r infra/nginx deploy@IP:/opt/sionmarket/
scp infra/.env.produccion.example deploy@IP:/opt/sionmarket/.env
```

En el servidor edita `/opt/sionmarket/.env` (`nano /opt/sionmarket/.env`):

- `API_DOMAIN`: el dominio del paso 2.
- `DATABASE_URL`: Supabase → **Connect** → *Session pooler* (puerto **5432**; el 6543 no sirve porque el worker
  escucha avisos de la base). Reemplaza `[YOUR-PASSWORD]` por la clave de la base.
- `CORS_ORIGINS`: el dominio donde está la web en Vercel.

Este archivo tiene la clave de tu base: no lo compartas ni lo subas a GitHub.

## 5. Certificado HTTPS (una sola vez)

```bash
docker run --rm -p 80:80 -v /etc/letsencrypt:/etc/letsencrypt certbot/certbot:v3.1.0 \
  certonly --standalone -d api.tudominio.com -m tucorreo@ejemplo.com --agree-tos -n
```

El servicio `certbot` del compose lo renueva solo. Para que nginx tome el certificado renovado,
agrega esta línea con `crontab -e` (usuario `deploy`):

```
0 4 * * * cd /opt/sionmarket && docker compose exec -T nginx nginx -s reload
```

## 6. La imagen del backend

Cada cambio en `main` publica la imagen en GitHub (`.github/workflows/backend.yml`). La primera vez:

1. En GitHub → *Actions* → **backend** → *Run workflow* (o une cualquier cambio del backend).
2. En tu perfil de GitHub → *Packages* → `sionmarket-backend` → *Package settings* → *Change visibility* → **Public**.
   La imagen no contiene claves; todo lo secreto vive en el `.env` del servidor.

## 7. Encender

```bash
cd /opt/sionmarket
docker compose up -d          # crea las tablas en Supabase y levanta todo
docker compose ps             # migrate debe salir con "Exited (0)", el resto "Up"
curl https://api.tudominio.com/v1/salud     # {"ok":true}
```

Datos para el piloto: si quieres arrancar con los 5 restaurantes de demostración,

```bash
docker compose run --rm migrate node dist/db/seed.js
```

## 8. Despliegue automático (opcional, recomendado)

En GitHub → *Settings* → *Secrets and variables* → *Actions*:

| Tipo | Nombre | Valor |
|---|---|---|
| Variable | `DEPLOY_HOST` | IP o dominio del servidor |
| Variable | `DEPLOY_USER` | `deploy` |
| Secreto | `DEPLOY_SSH_KEY` | una llave SSH privada cuya pública esté en `/home/deploy/.ssh/authorized_keys` |

Desde ese momento, unir un PR que toque el backend actualiza el servidor sin que entres.

## 9. Conectar la web y la app

En Vercel → proyecto **sion-market** → *Settings* → *Environment Variables* (Production):

| Nombre | Valor |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.tudominio.com/v1` |
| `EXPO_PUBLIC_REALTIME_URL` | `https://api.tudominio.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://oqaaxsuhtpmjnwuyqkzd.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | la llave *anon* (la misma de `sionmarket-web/js/config.js`) |

Luego *Deployments* → *Redeploy*. La app del teléfono usa las mismas variables en `apps/cliente/.env`.

## 10. Dar roles

Cuando el dueño de un restaurante haya entrado una vez a la app:

```bash
cd /opt/sionmarket
docker compose run --rm migrate node dist/db/rol.js --correo dueno@ejemplo.com --rol restaurante --restaurante pollos-el-cocuy
docker compose run --rm migrate node dist/db/rol.js --telefono +584141234567 --rol repartidor
```

## Mantenimiento

| Qué | Comando |
|---|---|
| Ver registros | `docker compose logs -f api worker realtime` |
| Reiniciar | `docker compose restart` |
| Volver a una versión anterior | `BACKEND_IMAGE=ghcr.io/lysmarrangel-dev/sionmarket-backend:<sha>` en `.env` y `docker compose up -d` |
| Respaldos | Supabase hace copias diarias (Project Settings → Database → Backups) |
