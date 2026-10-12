import { randomInt } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import {
  centsToVesCents,
  isTerminal,
  nextStatusesFor,
  OrderStatus,
  type Actor,
  type ChangeStatus,
  type CreateOrder,
  type Order,
  type PaymentMethod,
} from '@sionmarket/contracts';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth.js';
import { InjectDb } from '../../common/db.module.js';
import { AppError, forbidden, notFound } from '../../common/errors.js';
import type { Db, Tx } from '../../db/client.js';
import { orderItems, orders, orderStatusEvents, outboxEvents, restaurants, users } from '../../db/schema.js';
import { CatalogoService } from '../catalogo/catalogo.service.js';
import { PreciosService } from '../precios/precios.service.js';

type OrderRow = typeof orders.$inferSelect;

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => 'SM-' + Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
const newPin = () => String(randomInt(0, 10_000)).padStart(4, '0');

/** What this user is to this order. A user can hold several roles (e.g. admin who also orders). */
function actorsFor(user: AuthUser, order: OrderRow, restaurantOwnerId: string | null): Actor[] {
  const actors: Actor[] = [];
  if (order.customerId === user.id) actors.push('cliente');
  if (restaurantOwnerId === user.id) actors.push('restaurante');
  if (order.riderId === user.id) actors.push('repartidor');
  if (user.roles.includes('admin')) actors.push('admin');
  return actors;
}

@Injectable()
export class PedidosService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly precios: PreciosService,
    private readonly catalogo: CatalogoService,
  ) {}

  /** Creates the order in one short transaction; side effects go to the outbox for the worker. */
  async create(user: AuthUser, input: CreateOrder) {
    const priced = await this.precios.quote(user.id, input);
    const { totals } = priced;
    const { address } = priced;

    const id = await this.db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          code: newCode(),
          customerId: user.id,
          restaurantId: input.restaurantId,
          status: 'PENDIENTE',
          address: {
            alias: address.alias,
            street: address.street,
            reference: address.reference,
            latitude: address.location.latitude,
            longitude: address.location.longitude,
          },
          zoneId: address.zoneId,
          paymentMethod: input.paymentMethod,
          generalNote: input.generalNote ?? null,
          couponCode: priced.couponApplied,
          subtotalCents: totals.subtotalCents,
          productDiscountCents: totals.productDiscountCents,
          deliveryBaseCents: totals.deliveryBaseCents,
          deliveryDiscountCents: totals.deliveryDiscountCents,
          tipCents: totals.tipCents,
          exchangeRate: totals.exchangeRate,
          pickupPin: newPin(),
        })
        .returning();
      await tx.insert(orderItems).values(
        priced.lines.map((l) => ({
          orderId: order!.id,
          productId: l.productId,
          name: l.name,
          quantity: l.quantity,
          unitCents: l.unitCents,
          options: l.options,
          note: l.note,
        })),
      );
      await this.recordStatus(tx, order!, 'PENDIENTE', 'cliente', user.id, null);
      return order!.id;
    });
    return this.get(user, id);
  }

  async get(user: AuthUser, id: string): Promise<Order & { pickupPin?: string; allowedNext: OrderStatus[] }> {
    const { order, ownerId, restaurantName } = await this.load(id);
    const actors = actorsFor(user, order, ownerId);
    if (!actors.length) throw notFound('El pedido');
    const dto = await this.toDto(order, restaurantName);
    const allowedNext = [...new Set(actors.flatMap((a) => nextStatusesFor(order.status as OrderStatus, a)))];
    // The restaurant reads the PIN to the rider at pickup; nobody else sees it.
    const seesPin = actors.includes('restaurante') || actors.includes('admin');
    return { ...dto, allowedNext, ...(seesPin ? { pickupPin: order.pickupPin } : {}) };
  }

  async listForCustomer(user: AuthUser) {
    const rows = await this.db
      .select({ order: orders, restaurantName: restaurants.name })
      .from(orders)
      .innerJoin(restaurants, eq(restaurants.id, orders.restaurantId))
      .where(eq(orders.customerId, user.id))
      .orderBy(desc(orders.createdAt))
      .limit(50);
    return Promise.all(rows.map((r) => this.toDto(r.order, r.restaurantName)));
  }

  /** Restaurant panel inbox (oldest first, so nobody waits) or history (newest first). */
  async listForRestaurant(user: AuthUser, restaurantId: string, statuses?: OrderStatus[], newestFirst = false) {
    await this.catalogo.assertOwner(user, restaurantId);
    const rows = await this.db
      .select({ order: orders, restaurantName: restaurants.name })
      .from(orders)
      .innerJoin(restaurants, eq(restaurants.id, orders.restaurantId))
      .where(and(eq(orders.restaurantId, restaurantId), statuses?.length ? inArray(orders.status, statuses) : undefined))
      .orderBy(newestFirst ? desc(orders.createdAt) : asc(orders.createdAt))
      .limit(newestFirst ? 50 : 100);
    return Promise.all(rows.map(async (r) => ({ ...(await this.toDto(r.order, r.restaurantName)), pickupPin: r.order.pickupPin })));
  }

  async changeStatus(user: AuthUser, id: string, input: ChangeStatus) {
    const { order, ownerId } = await this.load(id);
    const from = order.status as OrderStatus;
    const actors = actorsFor(user, order, ownerId);
    if (!actors.length) throw notFound('El pedido');

    const actor = actors.find((a) => nextStatusesFor(from, a).includes(input.status));
    if (!actor) {
      throw new AppError('INVALID_TRANSITION', `No puedes pasar el pedido de ${from} a ${input.status}`, HttpStatus.CONFLICT);
    }
    if (input.status === 'ENTREGADO_AL_DELIVERY' && actor === 'repartidor' && input.pickupPin !== order.pickupPin) {
      throw new AppError('PICKUP_PIN_INVALID', 'El PIN de retiro no coincide');
    }

    await this.db.transaction(async (tx) => {
      // Guarded update: if someone else moved the order first, this one fails instead of overwriting.
      const [updated] = await tx
        .update(orders)
        .set({ status: input.status, updatedAt: new Date() })
        .where(and(eq(orders.id, id), eq(orders.status, from)))
        .returning();
      if (!updated) throw new AppError('INVALID_TRANSITION', 'El pedido cambió mientras tanto, recarga', HttpStatus.CONFLICT);
      await this.recordStatus(tx, updated, input.status, actor, user.id, input.reason ?? null);
    });
    return this.get(user, id);
  }

  /**
   * Transition made by the platform itself (timers, assignment engine). Does nothing if the
   * order already left `from`, so a late timer never overrides a human decision.
   */
  async systemTransition(id: string, from: OrderStatus, to: OrderStatus, reason: string) {
    if (!nextStatusesFor(from, 'sistema').includes(to)) throw new Error(`sistema no puede pasar de ${from} a ${to}`);
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(orders)
        .set({ status: to, updatedAt: new Date() })
        .where(and(eq(orders.id, id), eq(orders.status, from)))
        .returning();
      if (!updated) return false;
      await this.recordStatus(tx, updated, to, 'sistema', null, reason);
      return true;
    });
  }

  /** Manual assignment from the back office. The automatic engine replaces this in step 3. */
  async assignRider(user: AuthUser, id: string, riderId: string) {
    const [rider] = await this.db.select().from(users).where(eq(users.id, riderId));
    if (!rider?.roles.includes('repartidor')) throw notFound('El repartidor');
    const { order } = await this.load(id);
    if (isTerminal(order.status as OrderStatus)) throw new AppError('INVALID_TRANSITION', 'El pedido ya terminó', HttpStatus.CONFLICT);
    await this.db.transaction(async (tx) => {
      await tx.update(orders).set({ riderId, updatedAt: new Date() }).where(eq(orders.id, id));
      await tx.insert(outboxEvents).values({
        type: 'pedido.repartidor_asignado',
        aggregateId: id,
        payload: { orderId: id, code: order.code, riderId, customerId: order.customerId, restaurantId: order.restaurantId },
      });
    });
    return this.get(user, id);
  }

  private async recordStatus(tx: Tx, order: OrderRow, status: OrderStatus, actor: Actor, userId: string | null, reason: string | null) {
    await tx.insert(orderStatusEvents).values({ orderId: order.id, status, actor, actorUserId: userId, reason });
    await tx.insert(outboxEvents).values({
      type: 'pedido.estado_cambiado',
      aggregateId: order.id,
      payload: { orderId: order.id, code: order.code, status, actor, reason, restaurantId: order.restaurantId, customerId: order.customerId, riderId: order.riderId },
    });
  }

  private async load(id: string) {
    const [row] = await this.db
      .select({ order: orders, ownerId: restaurants.ownerUserId, restaurantName: restaurants.name })
      .from(orders)
      .innerJoin(restaurants, eq(restaurants.id, orders.restaurantId))
      .where(eq(orders.id, id));
    if (!row) throw notFound('El pedido');
    return row;
  }

  private async toDto(o: OrderRow, restaurantName: string): Promise<Order> {
    const [items, history] = await Promise.all([
      this.db.select().from(orderItems).where(eq(orderItems.orderId, o.id)).orderBy(asc(orderItems.id)),
      this.db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, o.id)).orderBy(asc(orderStatusEvents.id)),
    ]);
    const restaurantTotalCents = o.subtotalCents - o.productDiscountCents;
    const deliveryCents = o.deliveryBaseCents - o.deliveryDiscountCents;
    const platformTotalCents = deliveryCents + o.tipCents;
    const totalCents = restaurantTotalCents + platformTotalCents;
    return {
      id: o.id,
      code: o.code,
      status: o.status as OrderStatus,
      restaurant: { id: o.restaurantId, name: restaurantName },
      customerId: o.customerId,
      riderId: o.riderId,
      address: o.address,
      paymentMethod: o.paymentMethod as PaymentMethod,
      generalNote: o.generalNote,
      lines: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        unitCents: i.unitCents,
        lineCents: i.unitCents * i.quantity,
        options: i.options,
        note: i.note,
      })),
      totals: {
        subtotalCents: o.subtotalCents,
        productDiscountCents: o.productDiscountCents,
        restaurantTotalCents,
        deliveryBaseCents: o.deliveryBaseCents,
        deliveryDiscountCents: o.deliveryDiscountCents,
        deliveryCents,
        tipCents: o.tipCents,
        platformTotalCents,
        totalCents,
        exchangeRate: o.exchangeRate,
        totalVesCents: centsToVesCents(totalCents, o.exchangeRate),
      },
      history: history.map((h) => ({ status: h.status as OrderStatus, actor: h.actor, reason: h.reason, at: h.createdAt.toISOString() })),
      createdAt: o.createdAt.toISOString(),
    };
  }
}
