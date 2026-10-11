import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { OutboxRelay } from './worker/outbox-relay.js';
import { JobProcessors } from './worker/processors.js';
import { WorkerModule } from './worker/worker.module.js';

const ctx = await NestFactory.createApplicationContext(WorkerModule, { logger: ['log', 'warn', 'error'] });
ctx.enableShutdownHooks();
const relay = ctx.get(OutboxRelay);
const jobs = ctx.get(JobProcessors);
jobs.start();
await relay.start();
console.log('Worker SionMarket procesando eventos y colas');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await relay.stop();
    await jobs.stop();
    await ctx.close();
    process.exit(0);
  });
}
