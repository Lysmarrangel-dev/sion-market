import { Module } from '@nestjs/common';
import { DbModule } from '../common/db.module.js';
import { RedisModule } from '../common/redis.module.js';
import { NotificacionesModule } from '../modules/notificaciones/notificaciones.module.js';
import { PedidosModule } from '../modules/pedidos/pedidos.module.js';
import { EventHandlers } from './event-handlers.js';
import { OutboxRelay } from './outbox-relay.js';
import { JobProcessors } from './processors.js';
import { queuesProvider } from './queues.js';

@Module({
  imports: [DbModule, RedisModule, PedidosModule, NotificacionesModule],
  providers: [queuesProvider, EventHandlers, OutboxRelay, JobProcessors],
})
export class WorkerModule {}
