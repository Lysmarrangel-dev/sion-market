import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export function createDb(url: string, max = 10) {
  const sql = postgres(url, { max, onnotice: () => {} });
  return { db: drizzle(sql, { schema, casing: 'snake_case' }), sql };
}
