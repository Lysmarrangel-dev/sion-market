import { Inject } from '@nestjs/common';
import { Queue } from 'bullmq';
import { config } from '../config.js';

export const QUEUE_NOTIFICATIONS = 'notificaciones';
export const QUEUE_ORDERS = 'pedidos';

export type NotifyStatusJob = { orderId: string; status: string; reason: string | null };
export type NotifyAssignedJob = { orderId: string; code: string; riderId: string };
export type ExpireAcceptanceJob = { orderId: string };

// family 0: resolve IPv4 and IPv6, needed on private networks such as Railway's (IPv6 only).
export const connection = () => ({ url: config().REDIS_URL, maxRetriesPerRequest: null, family: 0 });

export const QUEUES = Symbol('QUEUES');
export const InjectQueues = () => Inject(QUEUES);
export type Queues = { notifications: Queue; orders: Queue };

export const queuesProvider = {
  provide: QUEUES,
  useFactory: (): Queues => {
    const defaultJobOptions = { attempts: 5, backoff: { type: 'exponential', delay: 2000 }, removeOnComplete: 1000, removeOnFail: 5000 };
    return {
      notifications: new Queue(QUEUE_NOTIFICATIONS, { connection: connection(), defaultJobOptions }),
      orders: new Queue(QUEUE_ORDERS, { connection: connection(), defaultJobOptions }),
    };
  },
};
