import { Injectable, Logger } from '@nestjs/common';
import { notificationFor, type OrderStatus } from '@sionmarket/contracts';
import { Worker, type Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { InjectDb } from '../common/db.module.js';
import type { Db } from '../db/client.js';
import { orders, restaurants, users } from '../db/schema.js';
import { NotificacionesService } from '../modules/notificaciones/notificaciones.service.js';
import { PedidosService } from '../modules/pedidos/pedidos.service.js';
import {
  connection,
  QUEUE_NOTIFICATIONS,
  QUEUE_ORDERS,
  type ExpireAcceptanceJob,
  type NotifyAssignedJob,
  type NotifyStatusJob,
} from './queues.js';

@Injectable()
export class JobProcessors {
  private readonly log = new Logger('jobs');
  private workers: Worker[] = [];

  constructor(
    @InjectDb() private readonly db: Db,
    private readonly pedidos: PedidosService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  start() {
    const opts = { connection: connection(), concurrency: 10 };
    this.workers = [
      new Worker(QUEUE_NOTIFICATIONS, (job) => this.notification(job), opts),
      new Worker(QUEUE_ORDERS, (job) => this.order(job), opts),
    ];
    for (const w of this.workers) w.on('failed', (job, err) => this.log.warn(`${job?.name} falló: ${err.message}`));
  }

  async stop() {
    await Promise.all(this.workers.map((w) => w.close()));
  }

  async notification(job: Pick<Job, 'name' | 'data'>) {
    if (job.name === 'estado') return this.notifyStatus(job.data as NotifyStatusJob);
    if (job.name === 'asignado') return this.notifyAssigned(job.data as NotifyAssignedJob);
  }

  async order(job: Pick<Job, 'name' | 'data'>) {
    if (job.name === 'vencer-aceptacion') return this.expireAcceptance((job.data as ExpireAcceptanceJob).orderId);
  }

  /** The restaurant did not answer in time: reject so the customer is not left waiting. */
  async expireAcceptance(orderId: string) {
    return this.pedidos.systemTransition(orderId, 'PENDIENTE', 'RECHAZADO', 'El restaurante no respondió a tiempo');
  }

  private async notifyStatus({ orderId, status, reason }: NotifyStatusJob) {
    const [row] = await this.db
      .select({ order: orders, restaurant: restaurants.name, ownerId: restaurants.ownerUserId, prepMin: restaurants.etaMin })
      .from(orders)
      .innerJoin(restaurants, eq(restaurants.id, orders.restaurantId))
      .where(eq(orders.id, orderId));
    if (!row) return;
    const data = { orderId, status };

    if (status === 'PENDIENTE') {
      // The customer just placed it; the one who needs to know is the restaurant.
      if (row.ownerId) await this.notificaciones.send({ userId: row.ownerId, title: 'Nuevo pedido', body: `Pedido ${row.order.code}`, data });
      return;
    }
    const rider = row.order.riderId ? (await this.db.select({ name: users.name }).from(users).where(eq(users.id, row.order.riderId)))[0] : undefined;
    const copy = notificationFor(status as OrderStatus, { restaurant: row.restaurant, rider: rider?.name, prepMin: row.prepMin, reason });
    await this.notificaciones.send({ userId: row.order.customerId, ...copy, data });
  }

  private async notifyAssigned({ orderId, code, riderId }: NotifyAssignedJob) {
    await this.notificaciones.send({ userId: riderId, title: 'Pedido asignado', body: `Tienes el pedido ${code}`, data: { orderId } });
  }
}
