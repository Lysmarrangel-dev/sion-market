# Sionmarket · App cliente (MVP)

Expo SDK 57 · React Native · TypeScript · Expo Router.

## Verlo en el teléfono

1. Instala **Expo Go** en el teléfono (App Store / Play Store).
2. En la computadora (Node 20+): `npm install` y luego `npx expo start`.
3. Escanea el QR con la cámara (iPhone) o con Expo Go (Android). Teléfono y computadora en la misma Wi‑Fi; si no, `npx expo start --tunnel`.

Cada cambio en el código se recarga al instante en el teléfono.

## Estructura

- `src/app/` rutas (cada archivo es una pantalla): onboarding, login, otp, `(tabs)` (inicio, buscar, pedidos, perfil), restaurante, producto, carrito, checkout, pedido (seguimiento), chat, calificar, reportar, factura, direcciones, referidos, editar-perfil, asistente.
- `src/components/` UI compartida (botón, precio USD/Bs., tarjetas, chat).
- `src/constants/theme.ts` colores, tipografías y ángulo de 16° del manual de marca.
- `src/data/mock.ts` datos de demo (restaurantes, menú, tasa BCV). Se reemplaza por la API.
- `src/data/order-states.ts` los 10 estados del pedido y los textos de notificación del documento de requerimientos.
- `src/store/` carrito, direcciones, pedidos y perfil; se guardan en el teléfono (AsyncStorage) hasta que exista el backend. `orders.tsx` simula al restaurante y al repartidor avanzando el pedido.

Cupones de demo: `SIONNUEVO` (delivery gratis) y `SION10` (10% en productos).

Login de demo: cualquier número de 10 dígitos y cualquier código de 6 dígitos.
