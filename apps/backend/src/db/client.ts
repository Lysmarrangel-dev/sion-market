import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/**
 * Use a session connection (Supabase: direct or session pooler on port 5432) so the
 * search_path below applies; PostGIS functions live in the `extensions` schema there.
 */
export function createDb(url: string, max = 10) {
  const sql = postgres(url, {
    max,
    onnotice: () => {},
    connection: { search_path: 'sionmarket, extensions, public' },
  });
  return { db: drizzle(sql, { schema, casing: 'snake_case' }), sql };
}
