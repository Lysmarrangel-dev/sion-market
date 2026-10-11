import { Injectable } from '@nestjs/common';
import { RT, type OrderStatus, type OrderStatusEvent } from '@sionmarket/contracts';
import { RealtimePublisher, rooms } from '../common/redis.module.js';
import { config } from '../config.js';
import type { outboxEvents } from '../db/schema.js';
import { InjectQueues, type ExpireAcceptanceJob, type NotifyAssignedJob, type NotifyStatusJob, type Queues } from './queues.js';

type OutboxRow = typeof outboxEvents.$inferSelect;

type StatusPayload = {
  orderId: string;
  code: string;
  status: OrderStatus;
  reason: string | null;
  restaurantId: string;
  customerId: string;
  riderId: string | null;
};
type AssignedPayload = { orderId: string; code: string; riderId: string; customerId: string; restaurantId: string };

/**
 * Turns one outbox event into its side effects. Each effect is either a Redis publish
 * (cheap, realtime) or a queued job (retried with backoff), so the relay never blocks on
 * an external service.
 */
@Injectable()
export class EventHandlers {
  constructor(
    private readonly realtime: RealtimePublisher,
    @InjectQueues() private readonly queues: Queues,
  ) {}

  async handle(event: OutboxRow) {
    switch (event.type) {
      case 'pedido.estado_cambiado':
        return this.statusChanged(event.payload as StatusPayload, event.createdAt);
      case 'pedido.repartidor_asignado':
        return this.riderAssigned(event.payload as AssignedPayload);
    }
  }

  private async statusChanged(p: StatusPayload, at: Date) {
    const data: OrderStatusEvent = { orderId: p.orderId, code: p.code, status: p.status, reason: p.reason, at: at.toISOString() };
    const targets = [rooms.order(p.orderId), rooms.user(p.customerId), rooms.restaurant(p.restaurantId)];
    if (p.riderId) targets.push(rooms.user(p.riderId));
    await this.realtime.publish({ rooms: targets, event: RT.orderStatus, data });

    if (p.status === 'PENDIENTE') {
      await this.realtime.publish({ rooms: [rooms.restaurant(p.restaurantId)], event: RT.orderNew, data });
      await this.queues.orders.add('vencer-aceptacion', { orderId: p.orderId } satisfies ExpireAcceptanceJob, {
        jobId: `vencer-${p.orderId}`,
        delay: config().ACCEPT_TIMEOUT_MIN * 60_000,
      });
    }
    await this.queues.notifications.add('estado', { orderId: p.orderId, status: p.status, reason: p.reason } satisfies NotifyStatusJob, {
      jobId: `estado-${p.orderId}-${p.status}`,
    });
  }

  private async riderAssigned(p: AssignedPayload) {
    await this.realtime.publish({
      rooms: [rooms.user(p.riderId)],
      event: RT.orderAssigned,
      data: { orderId: p.orderId, code: p.code, restaurantId: p.restaurantId },
    });
    await this.queues.notifications.add('asignado', { orderId: p.orderId, code: p.code, riderId: p.riderId } satisfies NotifyAssignedJob, {
      jobId: `asignado-${p.orderId}-${p.riderId}`,
    });
  }
}
