# Sionmarket · Web de pre-lanzamiento

Landing, registro, inicio de sesión, recuperación de cuenta y página de "muy pronto", con Supabase como base de datos y proveedor de autenticación. Sitio estático sin paso de compilación: HTML, CSS y módulos JS.

## Páginas

| Archivo | Qué hace |
|---|---|
| `index.html` | Landing. Incluye el formulario de afiliación de comercios (se guarda en `solicitudes_comercio`). |
| `registro.html` | Crea la cuenta. Nombre, apellido, correo, celular +58, contraseña con medidor, términos y consentimiento de marketing. |
| `login.html` | Inicia sesión. Si el correo no está confirmado, ofrece reenviar el enlace. |
| `recuperar.html` | Pide el enlace de recuperación. No revela si el correo existe. |
| `restablecer.html` | Destino del enlace del correo: crea la contraseña nueva. Detecta enlaces vencidos. |
| `pronto.html` | Destino de los enlaces de confirmación. Si falta el teléfono o aceptar los términos (cuentas de Google), los pide; si la cuenta está completa, pasa directo a la cuenta en `/app`. También muestra el estado "confirma tu correo" con reenvío. |
| `legal.html` | Borrador de términos y privacidad (revisar con un abogado). |

## Puesta en marcha

### 1. Base de datos
En Supabase → **SQL Editor**, ejecuta `supabase/migrations/0001_inicial.sql`. Crea:

- `ciudades` con San Felipe (el requerimiento pide `city_id` desde el día 1).
- `perfiles` (1:1 con `auth.users`), creada automáticamente por el trigger `handle_new_user` al registrarse.
- `solicitudes_comercio`, solo inserción pública, con límite de 3 envíos por teléfono cada 24 h.
- RLS en todas las tablas y privilegios por columna: el cliente solo puede editar nombre, apellido, teléfono, intereses y marketing. **El rol nunca se toma de los metadatos del registro** y solo lo cambia el back office con `service_role`.

### 2. Autenticación (Supabase → Authentication)
- **URL Configuration**
  - Site URL: tu dominio, por ejemplo `https://sionmarket.com`
  - Redirect URLs: `https://sionmarket.com/pronto.html`, `https://sionmarket.com/restablecer.html` y sus equivalentes de desarrollo (`http://localhost:3000/*`).
- **Providers → Email**: confirmación de correo activada.
- **Policies → Password**: longitud mínima 8 y requisito "letras y dígitos" (coincide con la validación del formulario).
- **Emails → Templates**: pega las plantillas de `supabase/templates/`:
  - Confirm signup → `confirmar-registro.html` · asunto: *Confirma tu correo en Sionmarket*
  - Reset password → `restablecer-clave.html` · asunto: *Crea tu contraseña nueva*
  - Change email → `cambio-correo.html` · asunto: *Confirma tu correo nuevo*
- **SMTP propio** (Resend, Brevo, SES…): el SMTP de prueba de Supabase solo envía unos pocos correos por hora. Configúralo antes de abrir el registro.
- **Google**: proveedor activo y `GOOGLE_HABILITADO = true` en `js/config.js`. Registro e inicio de sesión ofrecen "Continuar con Google"; las cuentas nuevas completan teléfono y términos en `pronto.html` y siguen a `/app`. Agrega `https://www.sionmarket.app/**` en Redirect URLs.

### 3. Conectar el front
Edita `js/config.js` con la **Project URL** y la **anon public key** (Project Settings → API). La anon key es pública por diseño; la protección real es RLS. Nunca pongas la `service_role` en el front.

### 4. Probar en local
```bash
npx serve -l 3000 .
# o
python3 -m http.server 3000
```
Mientras falte la configuración verás un aviso negro abajo.

### 5. Publicar
Funciona en cualquier hosting estático. Para Vercel, `vercel.json` ya trae cabeceras de seguridad (CSP que solo permite Supabase, jsDelivr y Google Fonts; HSTS; `frame-ancestors 'none'`) y caché larga para `assets/`.

## Marca
- Logotipos y isotipo extraídos de los archivos oficiales del manual, sin redibujar. Principal en modo claro, negativo en modo oscuro.
- Iquost es de licencia comercial: se usa **Montserrat Alternates**, su sustituto aprobado. Al licenciar Iquost para web, súbela a `assets/fonts/`, declara el `@font-face` y ya queda primera en `--f-titular`.
- Botones naranjas con texto negro (6,9:1). El blanco sobre naranja no pasa AA para texto normal.
- Proporción 60/25/10/5: el degradado solo aparece en el panel del hero, barras de progreso y bandas.
- Elementos gráficos del manual aplicados: tres ruedas como indicador de carga, líneas de velocidad en "En camino" y corte diagonal de 16° en el hero y las pantallas de acceso.

## Ver las solicitudes de comercios
Supabase → Table Editor → `solicitudes_comercio`, o desde n8n/back office con la `service_role`. El campo `estado` va de `nueva` a `contactada`, `afiliada` o `descartada`.

## Siguientes pasos sugeridos (según el documento de requerimientos)
- RF-C01: registro con teléfono + OTP por SMS/WhatsApp (Supabase Phone Auth con un proveedor como Twilio o MessageBird).
- RF-C02: tabla `direcciones` con validación contra polígonos de cobertura (PostGIS).
- Separar `roles` de comercio y repartidor con sus propias tablas de alta y verificación de documentos (Supabase Storage con políticas por usuario).

## La app en /app

El mismo proyecto de Vercel publica también la app cliente (Expo web) en `/app`: `build.sh` copia este
sitio a `dist/` y exporta `apps/cliente` dentro de `dist/app`. Sin variables `EXPO_PUBLIC_*` la app corre en
modo demo; cuando el backend esté publicado, agrega en Vercel (Settings → Environment Variables)
`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_REALTIME_URL`, `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
Como sitio y app comparten dominio y la misma clave de sesión (`sionmarket-auth`), la sesión iniciada en la web
sirve también en la app. "Ir a mi cuenta" lleva a `/app`: cualquiera puede ver los restaurantes reales, y al
intentar pedir, ver pedidos o el perfil, la app manda a `login.html?siguiente=app/...` y vuelve a esa pantalla.

Desde un celular, "Pedir ahora" intenta abrir la app del teléfono (`sionmarket://`). Cuando la publiques, pon los
enlaces de las tiendas en `js/config.js` (`PLAY_STORE_URL`, `APP_STORE_URL`); mientras estén vacíos, sigue en la web.

El tema claro u oscuro se elige con el botón de sol/luna (por defecto sigue al sistema) y se guarda en
`localStorage` con la clave `sm-tema`, que también lee la app en `/app`.
