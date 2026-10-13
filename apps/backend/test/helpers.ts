import { createHash } from 'node:crypto';
import { Redis } from 'ioredis';
import { SignJWT } from 'jose';
import postgres from 'postgres';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import { DEMO_USERS, seed } from '../src/db/seed.js';

/** Fresh database + app for an end-to-end test file. */
export async function setup() {
  const url = process.env.DATABASE_URL!;
  if (!url.includes('test')) throw new Error('Las pruebas solo corren contra una base *_test');
  const admin = postgres(url, { max: 1, onnotice: () => {} });
  await admin.unsafe('drop schema if exists sionmarket cascade; drop schema if exists drizzle cascade;');
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
  const call = async (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, body?: unknown, token?: string): Promise<Res> => {
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
    login: signIn,
  };
}

/** Mints a token shaped like the ones Supabase Auth issues, signed with the test secret. */
export async function signIn(phone: string, email?: string) {
  const demo = Object.values(DEMO_USERS).find((u) => u.phone === phone);
  const id = demo?.id ?? uuidFrom(phone);
  const accessToken = await new SignJWT({ role: 'authenticated', phone: phone.replace(/^\+/, ''), ...(email ? { email } : {}) })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(id)
    .setAudience('authenticated')
    .setIssuer(`${process.env.SUPABASE_URL}/auth/v1`)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!));
  return { accessToken, user: { id } };
}

function uuidFrom(text: string) {
  const h = createHash('sha256').update(text).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
