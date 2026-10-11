import fs from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { PACKAGE_ROOT } from '../paths.js';
import { createDb, type Db } from './client.js';
import * as s from './schema.js';

// Demo data generated from the client app's mock (src/data/mock.ts), in cents.
type Demo = {
  rate: number;
  zone: { id: string; name: string; ring: [number, number][] };
  categories: (typeof s.categories.$inferInsert)[];
  restaurants: (Omit<typeof s.restaurants.$inferInsert, 'location'> & { location: [number, number] })[];
  groups: (typeof s.modifierGroups.$inferInsert)[];
  options: (typeof s.modifierOptions.$inferInsert)[];
  products: (typeof s.products.$inferInsert)[];
  links: (typeof s.productModifierGroups.$inferInsert)[];
  coupons: { code: string; label: string; target: 'productos' | 'delivery'; percent: number }[];
};

/**
 * Demo accounts with fixed ids. In tests a token is minted for these ids; on a real Supabase
 * project, give real accounts their roles with `db:rol` instead.
 */
export const DEMO_USERS = {
  admin: { id: '00000000-0000-4000-8000-000000000009', phone: '+584120000009' },
  rider: { id: '00000000-0000-4000-8000-000000000002', phone: '+584120000002' },
  /** Owner of every demo restaurant. */
  restaurant: { id: '00000000-0000-4000-8000-000000000001', phone: '+584120000001' },
} as const;

const upsert = <T extends { id: unknown }>(t: T) => ({ target: t.id as never });

export async function seed(db: Db) {
  const demo: Demo = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'seed/demo.json'), 'utf8'));
  const ring = [...demo.zone.ring, demo.zone.ring[0]!].map(([lng, lat]) => `${lng} ${lat}`).join(', ');

  await db.transaction(async (tx) => {
    const [, , owner] = await tx
      .insert(s.users)
      .values([
        { ...DEMO_USERS.admin, name: 'Admin SionMarket', roles: ['admin'] },
        { ...DEMO_USERS.rider, name: 'José Luis Pérez', roles: ['repartidor'] },
        { ...DEMO_USERS.restaurant, name: 'Dueño de restaurantes demo', roles: ['restaurante'] },
      ])
      .onConflictDoUpdate({ target: s.users.id, set: { roles: sql`excluded.roles` } })
      .returning();

    await tx
      .insert(s.zones)
      .values({ id: demo.zone.id, name: demo.zone.name, area: sql`ST_GeomFromText(${`POLYGON((${ring}))`}, 4326)` as never })
      .onConflictDoUpdate({ target: s.zones.id, set: { name: demo.zone.name, area: sql`excluded.area` } });

    await tx.insert(s.categories).values(demo.categories).onConflictDoUpdate({
      ...upsert(s.categories),
      set: { name: sql`excluded.name`, icon: sql`excluded.icon`, sort: sql`excluded.sort` },
    });

    for (const r of demo.restaurants) {
      const row = {
        ...r,
        location: { x: r.location[0], y: r.location[1] },
        zoneId: demo.zone.id,
        ownerUserId: owner!.id,
      };
      await tx.insert(s.restaurants).values(row).onConflictDoUpdate({ ...upsert(s.restaurants), set: row });
    }
    for (const g of demo.groups) await tx.insert(s.modifierGroups).values(g).onConflictDoUpdate({ ...upsert(s.modifierGroups), set: g });
    for (const o of demo.options) await tx.insert(s.modifierOptions).values(o).onConflictDoUpdate({ ...upsert(s.modifierOptions), set: o });
    for (const p of demo.products) await tx.insert(s.products).values(p).onConflictDoUpdate({ ...upsert(s.products), set: p });
    await tx.insert(s.productModifierGroups).values(demo.links).onConflictDoNothing();
    for (const c of demo.coupons) {
      await tx.insert(s.coupons).values(c).onConflictDoUpdate({ target: s.coupons.code, set: c });
    }
    await tx.insert(s.exchangeRates).values({ rate: demo.rate, source: 'demo' });
  });
}

if (import.meta.main) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL no está definido');
  const { db, sql: conn } = createDb(url, 1);
  await seed(db);
  await conn.end();
  console.log('Datos demo cargados.');
}
