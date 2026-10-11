import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { config } from './config.js';

export async function createApp() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: true }), {
    logger: config().NODE_ENV === 'test' ? ['error'] : ['log', 'warn', 'error'],
  });
  const origins = config().CORS_ORIGINS;
  app.enableCors({ origin: origins === '*' ? true : origins.split(',') });
  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();
  return app;
}
