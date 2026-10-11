import path from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { PACKAGE_ROOT } from '../paths.js';
import { createDb } from './client.js';

export async function runMigrations(url: string) {
  const { db, sql } = createDb(url, 1);
  try {
    await migrate(db, { migrationsFolder: path.join(PACKAGE_ROOT, 'drizzle'), migrationsSchema: 'sionmarket' });
  } finally {
    await sql.end();
  }
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no está definido');
  await runMigrations(url);
  console.log('Migraciones aplicadas');
}
