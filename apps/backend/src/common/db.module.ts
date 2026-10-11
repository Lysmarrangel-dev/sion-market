import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { config } from '../config.js';
import { createDb } from '../db/client.js';

export const DB = Symbol('DB');
export const InjectDb = () => Inject(DB);
/** Raw postgres.js client, for LISTEN/NOTIFY. */
export const SQL = Symbol('SQL');
export const InjectSql = () => Inject(SQL);

const { db, sql } = createDb(config().DATABASE_URL);

@Global()
@Module({ providers: [{ provide: DB, useValue: db }, { provide: SQL, useValue: sql }], exports: [DB, SQL] })
export class DbModule implements OnApplicationShutdown {
  async onApplicationShutdown() {
    await sql.end({ timeout: 5 });
  }
}
