# Publicar el backend de SionMarket

El backend (API, tiempo real y worker) corre en un servidor con Docker. La base de datos y el login
son tu proyecto de Supabase. Cuando termines, la web (`/app`) y la app del teléfono dejan el modo demo
y empiezan a crear pedidos reales.

```
teléfono / web ──HTTPS──► api.tudominio.com (nginx) ──► api ×2 · realtime · worker ──► Redis (en el servidor)
                                                                      └──────────────► Supabase (Postgres + Auth)
```

Tiempo estimado: media hora la primera vez. Después, cada cambio que se una a `main` se publica solo.

## Paso a paso en Contabo

### 1. Elegir el sistema

En el panel de Contabo → tu VPS → **Reinstall**: imagen **Ubuntu 24.04**, y anota la clave de root.
Contabo te manda la IP por correo. Si tu Supabase está en EE. UU., una VPS en *US East* responde más rápido.

### 2. Apuntar el dominio

En tu proveedor de DNS crea un registro **A**: `api.tudominio.com` → IP del VPS.
Espera unos minutos y compruébalo desde tu PC: `nslookup api.tudominio.com` debe mostrar esa IP.

### 3. Preparar el servidor (un solo comando)

Entra por SSH (en Windows sirve PowerShell): `ssh root@IP-DEL-VPS` y pega:

```bash
curl -fsSL https://raw.githubusercontent.com/Lysmarrangel-dev/sion-market/main/infra/servidor/instalar.sh \
  | bash -s -- api.tudominio.com tucorreo@ejemplo.com
```

El script (`infra/servidor/instalar.sh`) instala Docker y el firewall (solo 22, 80 y 443), crea el usuario
`deploy`, baja la configuración a `/opt/sionmarket`, saca el certificado HTTPS y programa su renovación.
Si el DNS todavía no apunta al VPS, te avisa y puedes volver a correrlo después.

### 4. Conectar Supabase

```bash
nano /opt/sionmarket/.env
```

- `DATABASE_URL`: Supabase → **Connect** → *Session pooler* (puerto **5432**; el 6543 no sirve porque el worker
  escucha avisos de la base). Reemplaza `[YOUR-PASSWORD]` por la clave de la base.
- `CORS_ORIGINS`: el dominio de tu web en Vercel, por ejemplo `https://sionmarket.com`.

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`. Este archivo tiene la clave de tu base: no lo compartas.

### 5. Hacer pública la imagen del backend (una sola vez)

Al unir el PR, GitHub publica la imagen (*Actions* → **backend**). Luego: tu perfil de GitHub → *Packages* →
`sionmarket-backend` → *Package settings* → *Change visibility* → **Public**. La imagen no tiene claves.

### 6. Encender

```bash
cd /opt/sionmarket
docker compose up -d          # crea las tablas en Supabase y levanta todo
docker compose ps             # migrate "Exited (0)", el resto "Up"
curl https://api.tudominio.com/v1/salud     # {"ok":true}
```

Para arrancar el piloto con los 5 restaurantes de demostración:
`docker compose run --rm migrate node dist/db/seed.js`

### 7. Seguridad de SSH (recomendado)

Cuando ya entres con tu propia llave SSH, desactiva la clave de root:
`sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl restart ssh`

### 8. Despliegue automático (recomendado)

En GitHub → *Settings* → *Secrets and variables* → *Actions*:

| Tipo | Nombre | Valor |
|---|---|---|
| Variable | `DEPLOY_HOST` | la IP del VPS |
| Variable | `DEPLOY_USER` | `deploy` |
| Secreto | `DEPLOY_SSH_KEY` | lo que imprime `cat /home/deploy/.ssh/github_actions` en el VPS (la llave que creó el script) |

Desde ese momento, unir un PR que toque el backend actualiza el servidor sin que entres.

### 9. Conectar la web y la app

En Vercel → proyecto **sion-market** → *Settings* → *Environment Variables* (Production):

| Nombre | Valor |
|---|---|
| `EXPO_PUBLIC_API_URL` | `https://api.tudominio.com/v1` |
| `EXPO_PUBLIC_REALTIME_URL` | `https://api.tudominio.com` |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://oqaaxsuhtpmjnwuyqkzd.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | la llave *anon* (la misma de `sionmarket-web/js/config.js`) |

Luego *Deployments* → *Redeploy*. La app del teléfono usa las mismas variables en `apps/cliente/.env`.

### 10. Dar roles

Cada persona entra una vez a la app o a la web y luego se le da su rol. Para administrar todo
(ver y editar cualquier restaurante desde *Perfil → Panel del restaurante*), dale `admin` a tu cuenta:
`docker compose run --rm migrate node dist/db/rol.js --correo tu@correo.com --rol admin`

Un dueño con `restaurante` registra su local y su menú desde ese mismo panel. Con `--restaurante`
se le asigna uno que ya exista:

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

## Alternativa: Railway

Si alguna vez quieres probar sin servidor propio, puedes usar [Railway](https://railway.com). Railway pone HTTPS y dominios solo,
así que aquí no hacen falta nginx ni certbot. La configuración de cada servicio ya está en `infra/railway/`.

1. **Nuevo proyecto** → *Deploy from GitHub repo* → `Lysmarrangel-dev/sion-market`. Railway crea un servicio;
   llámalo `api`.
2. En el mismo proyecto: *+ New* → *Database* → **Redis**.
3. Crea dos servicios más desde el mismo repo (*+ New* → *GitHub Repo*) y llámalos `realtime` y `worker`.
4. En cada servicio → *Settings* → *Config-as-code* → **Railway Config File**, pon la ruta:
   `infra/railway/api.json`, `infra/railway/realtime.json` y `infra/railway/worker.json`.
5. **Variables.** En el proyecto → *Settings* → *Shared Variables* crea estas y compártelas con los tres servicios:

   | Nombre | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | la cadena *Session pooler* de Supabase (puerto 5432) |
   | `SUPABASE_URL` | `https://oqaaxsuhtpmjnwuyqkzd.supabase.co` |
   | `REDIS_URL` | `${{Redis.REDIS_URL}}` |
   | `CORS_ORIGINS` | el dominio de la web en Vercel |
   | `PUSH_ENABLED` | `true` |

   Y solo en el servicio `realtime` agrega `PORT=3001` y `REALTIME_PORT=3001`.
6. **Dominios.** En `api` y en `realtime` → *Settings* → *Networking* → **Generate Domain**. El `worker` no lleva dominio.
7. Al desplegar, `api` crea las tablas en Supabase antes de arrancar. Comprueba:
   `https://<dominio-api>/v1/salud` → `{"ok":true}` y `https://<dominio-realtime>/salud` → `{"ok":true}`.
8. En Vercel (paso 9 de abajo) usa `EXPO_PUBLIC_API_URL=https://<dominio-api>/v1` y
   `EXPO_PUBLIC_REALTIME_URL=https://<dominio-realtime>`.

Para los datos demo y los roles, en el servicio `api` abre la consola (*⋯* → *Shell*) y corre
`node dist/db/seed.js` o `node dist/db/rol.js --correo … --rol restaurante --restaurante …`.

Cada cambio que se una a `main` en el backend vuelve a desplegar los tres servicios.
