import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { RT, type OrderStatusEvent, type RiderPosition } from '@sionmarket/contracts';
import { Redis } from 'ioredis';
import { io as connect, type Socket } from 'socket.io-client';
import { createDb } from '../src/db/client.js';
import { DEMO_USERS } from '../src/db/seed.js';
import { SupabaseTokenVerifier } from '../src/common/supabase-auth.js';
import { createRealtimeServer } from '../src/realtime/server.js';
import { OutboxRelay } from '../src/worker/outbox-relay.js';
import { JobProcessors } from '../src/worker/processors.js';
import { QUEUES, type Queues } from '../src/worker/queues.js';
import { WorkerModule } from '../src/worker/worker.module.js';
import { setup } from './helpers.js';


let ctx: Awaited<ReturnType<typeof setup>>;
let worker: INestApplicationContext;
let relay: OutboxRelay;
let rt: ReturnType<typeof createRealtimeServer>;
let url: string;
const sockets: Socket[] = [];
const conn = createDb(process.env.DATABASE_URL!, 2);
const redis = new Redis(process.env.REDIS_URL!);

before(async () => {
  ctx = await setup();
  worker = await NestFactory.createApplicationContext(WorkerModule, { logger: ['error'] });
  relay = worker.get(OutboxRelay);
  const http = createServer();
  rt = createRealtimeServer({ http, db: conn.db, redis, verifier: new SupabaseTokenVerifier({ supabaseUrl: process.env.SUPABASE_URL, jwtSecret: process.env.SUPABASE_JWT_SECRET }), corsOrigin: true });
  await rt.ready;
  await new Promise<void>((r) => http.listen(0, r));
  url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

after(async () => {
  for (const s of sockets) s.disconnect();
  await rt.close();
  const queues = worker.get<Queues>(QUEUES);
  await Promise.all([queues.notifications.close(), queues.orders.close()]);
  await worker.close();
  await ctx.app.close();
  await redis.quit();
  await conn.sql.end();
});

function socket(token: string) {
  const s = connect(url, { path: '/ws', auth: { token }, transports: ['websocket'] });
  sockets.push(s);
  return new Promise<Socket>((resolve, reject) => {
    s.once('connect', () => resolve(s));
    s.once('connect_error', reject);
  });
}

const next = <T>(s: Socket, event: string) => new Promise<T>((resolve) => s.once(event, resolve));
const emit = (s: Socket, event: string, data: unknown) => s.emitWithAck(event, data) as Promise<{ ok: boolean; error?: string }>;

async function placeOrder(token: string) {
  const addr = await ctx.api.call(
    'POST',
    '/yo/direcciones',
    { alias: 'Casa', street: 'Calle 10', reference: 'Portón verde', location: { latitude: 10.3399, longitude: -68.7425 } },
    token,
  );
  const order = await ctx.api.call(
    'POST',
    '/pedidos',
    {
      restaurantId: 'pollos-el-cocuy',
      addressId: addr.body.id,
      lines: [{ productId: 'p10', quantity: 1, optionIds: [] }],
      paymentMethod: 'efectivo',
    },
    token,
  );
  assert.equal(order.status, 201, JSON.stringify(order.body));
  return order.body.id as string;
}

test('sin token no conecta', async () => {
  await assert.rejects(socket('basura'), /UNAUTHORIZED/);
});

test('el restaurante recibe el pedido nuevo y el cliente ve cada cambio al instante', async () => {
  const customer = await ctx.api.login('+584147778899');
  const resto = await ctx.api.login(DEMO_USERS.restaurant.phone);
  const restoSocket = await socket(resto.accessToken);
  assert.deepEqual(await emit(restoSocket, 'suscribir', { restaurantId: 'pollos-el-cocuy' }), { ok: true });

  const newOrder = next<OrderStatusEvent>(restoSocket, RT.orderNew);
  const orderId = await placeOrder(customer.accessToken);
  await relay.drain();
  assert.equal((await newOrder).orderId, orderId);

  const custSocket = await socket(customer.accessToken);
  assert.deepEqual(await emit(custSocket, 'suscribir', { orderId }), { ok: true });

  const accepted = next<OrderStatusEvent>(custSocket, RT.orderStatus);
  await ctx.api.call('POST', `/pedidos/${orderId}/estado`, { status: 'ACEPTADO' }, resto.accessToken);
  await relay.drain();
  assert.equal((await accepted).status, 'ACEPTADO');

  // The relay also queued the customer push and the acceptance timer.
  const queues = worker.get<Queues>(QUEUES);
  assert.ok(await queues.notifications.getJob(`estado-${orderId}-ACEPTADO`));
  assert.ok(await queues.orders.getJob(`vencer-${orderId}`));
});

test('nadie más puede seguir un pedido ajeno', async () => {
  const owner = await ctx.api.login('+584241112222');
  const orderId = await placeOrder(owner.accessToken);
  const intruder = await socket((await ctx.api.login('+584243334444')).accessToken);
  assert.deepEqual(await emit(intruder, 'suscribir', { orderId }), { ok: false, error: 'FORBIDDEN' });
  const notOwner = await socket((await ctx.api.login('+584245556666')).accessToken);
  assert.deepEqual(await emit(notOwner, 'suscribir', { restaurantId: 'pollos-el-cocuy' }), { ok: false, error: 'FORBIDDEN' });
});

test('si el restaurante no responde, el pedido pasa a RECHAZADO solo', async () => {
  const customer = await ctx.api.login('+584126667777');
  const orderId = await placeOrder(customer.accessToken);
  assert.equal(await worker.get(JobProcessors).expireAcceptance(orderId), true);
  const order = await ctx.api.call('GET', `/pedidos/${orderId}`, undefined, customer.accessToken);
  assert.equal(order.body.status, 'RECHAZADO');
  assert.equal(order.body.history.at(-1).actor, 'sistema');
  // A late timer after a human decision changes nothing.
  assert.equal(await worker.get(JobProcessors).expireAcceptance(orderId), false);
});

test('la ubicación del repartidor llega al cliente que sigue el pedido', async () => {
  const customer = await ctx.api.login('+584129990000');
  const resto = await ctx.api.login(DEMO_USERS.restaurant.phone);
  const admin = await ctx.api.login(DEMO_USERS.admin.phone);
  const rider = await ctx.api.login(DEMO_USERS.rider.phone);
  const orderId = await placeOrder(customer.accessToken);

  const inbox = await ctx.api.call('GET', '/restaurantes/pollos-el-cocuy/pedidos?estado=PENDIENTE', undefined, resto.accessToken);
  const pin = inbox.body.find((o: { id: string }) => o.id === orderId).pickupPin;
  for (const status of ['ACEPTADO', 'EN_PREPARACION', 'LISTO']) {
    await ctx.api.call('POST', `/pedidos/${orderId}/estado`, { status }, resto.accessToken);
  }
  await ctx.api.call('POST', `/pedidos/${orderId}/asignar`, { riderId: rider.user.id }, admin.accessToken);
  await ctx.api.call('POST', `/pedidos/${orderId}/estado`, { status: 'ENTREGADO_AL_DELIVERY', pickupPin: pin }, rider.accessToken);

  const custSocket = await socket(customer.accessToken);
  await emit(custSocket, 'suscribir', { orderId });
  const riderSocket = await socket(rider.accessToken);

  const position = next<RiderPosition>(custSocket, RT.riderPosition);
  assert.deepEqual(await emit(riderSocket, 'ubicacion', { latitude: 10.341, longitude: -68.741 }), { ok: true });
  const p = await position;
  assert.equal(p.orderId, orderId);
  assert.equal(p.latitude, 10.341);
  const [geo] = await redis.geopos('repartidores:geo', rider.user.id);
  assert.ok(geo);
});
