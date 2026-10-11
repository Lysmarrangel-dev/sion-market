import { Redis } from 'ioredis';
import postgres from 'postgres';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { seed } from '../src/db/seed.js';

/** Fresh database + app for an end-to-end test file. */
export async function setup() {
  const url = process.env.DATABASE_URL!;
  if (!url.includes('test')) throw new Error('Las pruebas solo corren contra una base *_test');
  const admin = postgres(url, { max: 1, onnotice: () => {} });
  await admin.unsafe('drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;');
  await admin.end();
  await runMigrations(url);
  const { db, sql } = createDb(url, 1);
  await seed(db);
  await sql.end();

  const redis = new Redis(process.env.REDIS_URL!);
  await redis.flushdb();
  await redis.quit();

  const app = await createApp();
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return { app, api: client(app) };
}

type Res = { status: number; body: any };

export function client(app: NestFastifyApplication) {
  const call = async (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, body?: unknown, token?: string): Promise<Res> => {
    const res = await app.inject({
      method,
      url: `/v1${url}`,
      payload: body as never,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null };
  };
  return {
    call,
    async login(phone: string) {
      await call('POST', '/auth/otp', { phone });
      const res = await call('POST', '/auth/otp/verificar', { phone, code: process.env.OTP_DEV_CODE });
      if (res.status !== 200) throw new Error(`login falló: ${JSON.stringify(res.body)}`);
      return res.body as { accessToken: string; refreshToken: string; user: { id: string } };
    },
  };
}
