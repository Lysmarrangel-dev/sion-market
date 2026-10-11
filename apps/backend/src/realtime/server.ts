import type { Server as HttpServer } from 'node:http';
import { JwtService } from '@nestjs/jwt';
import { RiderLocation, RT, Subscribe, type RiderPosition, type Role } from '@sionmarket/contracts';
import { and, eq, inArray } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import { Server, type Socket } from 'socket.io';
import { RT_CHANNEL, rooms, type RealtimeMessage } from '../common/redis.module.js';
import type { Db } from '../db/client.js';
import { orders, restaurants } from '../db/schema.js';

const ON_THE_WAY = ['ENTREGADO_AL_DELIVERY', 'EN_CAMINO', 'LLEGANDO'];
export const RIDERS_GEO = 'repartidores:geo';

type SocketUser = { id: string; roles: Role[] };
type Ack = (res: { ok: boolean; error?: string }) => void;

/**
 * WebSocket gateway. Holds no business logic: it authenticates sockets, checks who may
 * follow what, relays events published on Redis, and ingests rider positions.
 * Several copies can run behind Nginx; each subscribes to the same Redis channel.
 */
export function createRealtimeServer(opts: { http: HttpServer; db: Db; redis: Redis; jwtSecret: string; corsOrigin: string[] | true }) {
  const { db, redis } = opts;
  const jwt = new JwtService({ secret: opts.jwtSecret });
  const io = new Server(opts.http, { path: '/ws', cors: { origin: opts.corsOrigin } });

  io.use(async (socket, next) => {
    try {
      const token = String(socket.handshake.auth?.token ?? '');
      const payload = await jwt.verifyAsync<{ sub: string; roles: Role[] }>(token);
      socket.data.user = { id: payload.sub, roles: payload.roles } satisfies SocketUser;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    void socket.join(rooms.user(user.id));

    socket.on('suscribir', async (raw: unknown, ack?: Ack) => {
      const parsed = Subscribe.safeParse(raw);
      if (!parsed.success) return ack?.({ ok: false, error: 'VALIDATION' });
      const room = 'orderId' in parsed.data ? await orderRoom(user, parsed.data.orderId) : await restaurantRoom(user, parsed.data.restaurantId);
      if (!room) return ack?.({ ok: false, error: 'FORBIDDEN' });
      await socket.join(room);
      ack?.({ ok: true });
    });

    socket.on('desuscribir', async (raw: unknown) => {
      const parsed = Subscribe.safeParse(raw);
      if (!parsed.success) return;
      await socket.leave('orderId' in parsed.data ? rooms.order(parsed.data.orderId) : rooms.restaurant(parsed.data.restaurantId));
    });

    // Rider positions go to Redis only (GEO set for the assignment engine) and straight to the
    // customers following the rider's active orders. PostgreSQL is not touched on this path.
    let activeOrders: { ids: string[]; until: number } = { ids: [], until: 0 };
    socket.on('ubicacion', async (raw: unknown, ack?: Ack) => {
      if (!user.roles.includes('repartidor')) return ack?.({ ok: false, error: 'FORBIDDEN' });
      const parsed = RiderLocation.safeParse(raw);
      if (!parsed.success) return ack?.({ ok: false, error: 'VALIDATION' });
      const { latitude, longitude } = parsed.data;
      await redis.geoadd(RIDERS_GEO, longitude, latitude, user.id);

      if (Date.now() > activeOrders.until) {
        const rows = await db
          .select({ id: orders.id })
          .from(orders)
          .where(and(eq(orders.riderId, user.id), inArray(orders.status, ON_THE_WAY)));
        activeOrders = { ids: rows.map((r) => r.id), until: Date.now() + 15_000 };
      }
      const at = new Date().toISOString();
      for (const orderId of activeOrders.ids) {
        const data: RiderPosition = { orderId, riderId: user.id, latitude, longitude, at };
        io.to(rooms.order(orderId)).emit(RT.riderPosition, data);
      }
      ack?.({ ok: true });
    });
  });

  async function orderRoom(user: SocketUser, orderId: string) {
    const [row] = await db
      .select({ customerId: orders.customerId, riderId: orders.riderId, ownerId: restaurants.ownerUserId })
      .from(orders)
      .innerJoin(restaurants, eq(restaurants.id, orders.restaurantId))
      .where(eq(orders.id, orderId));
    if (!row) return null;
    const allowed = user.roles.includes('admin') || [row.customerId, row.riderId, row.ownerId].includes(user.id);
    return allowed ? rooms.order(orderId) : null;
  }

  async function restaurantRoom(user: SocketUser, restaurantId: string) {
    const [row] = await db.select({ ownerId: restaurants.ownerUserId }).from(restaurants).where(eq(restaurants.id, restaurantId));
    if (!row) return null;
    return user.roles.includes('admin') || row.ownerId === user.id ? rooms.restaurant(restaurantId) : null;
  }

  const sub = redis.duplicate();
  const ready = sub.subscribe(RT_CHANNEL).then(() =>
    sub.on('message', (_channel, message) => {
      const msg = JSON.parse(message) as RealtimeMessage;
      io.to(msg.rooms).emit(msg.event, msg.data);
    }),
  );

  return {
    io,
    ready,
    async close() {
      await new Promise<void>((resolve) => io.close(() => resolve()));
      await sub.quit();
    },
  };
}
