import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  extensionsFilters: ['postgis'],
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://sionmarket:sionmarket@localhost:5432/sionmarket' },
});
