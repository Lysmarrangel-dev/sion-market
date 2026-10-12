import { HttpStatus, Injectable } from '@nestjs/common';
import {
  TERMINAL_STATUSES,
  type AdminOrder,
  type AdminOrderQuery,
  type AdminRestaurant,
  type AdminSummary,
  type AdminUser,
  type AdminUserQuery,
  type BusinessRequest,
  type OrderStatus,
  type RequestStatus,
  type Role,
  type StatsPeriod,
} from '@sionmarket/contracts';
import { and, desc, eq, ilike, inArray, notInArray, or, sql } from 'drizzle-orm';
import type { AuthUser } from '../../common/auth.js';
import { InjectDb } from '../../common/db.module.js';
import { AppError, notFound } from '../../common/errors.js';
import { UserDirectory } from '../../common/supabase-auth.js';
import type { Db } from '../../db/client.js';
import { orders, restaurants, users, zones } from '../../db/schema.js';
import { CatalogoService } from '../catalogo/catalogo.service.js';
import { EstadisticasService, rangeFor } from '../estadisticas/estadisticas.service.js';

const DAYS_30 = sql`now() - interval '30 days'`;

/** The website's "Registra tu comercio" form writes here (Supabase, public schema). */
const REQUESTS = sql`public.solicitudes_comercio`;

const pick = (row: Record<string, unknown>, ...keys: string[]) => {
  for (const k of keys) if (row[k] != null) return String(row[k]);
  return null;
};

@Injectable()
export class AdminService {
  constructor(
    @InjectDb() private readonly db: Db,
    private readonly stats: EstadisticasService,
    private readonly catalogo: CatalogoService,
    private readonly directory: UserDirectory,
  ) {}

  async summary(period: StatsPeriod): Promise<AdminSummary> {
    const range = rangeFor(period);
    const all = sql`true`;
    const [current, previous, series, counts, active, top, pendingRequests] = await Promise.all([
      this.stats.totals(all, range.from, range.to),
      this.stats.totals(all, range.prevFrom, range.prevTo),
      this.stats.series(all, range),
      this.db.execute<Record<string, number>>(sql`
        select
          (select count(*) from sionmarket.restaurants)::int as restaurants,
          (select count(*) from sionmarket.restaurants where enabled)::int as enabled,
          (select count(*) from sionmarket.restaurants where enabled and open)::int as open,
          (select count(*) from sionmarket.zones)::int as zones,
          (select count(*) from sionmarket.zones where active)::int as active_zones,
          (select count(*) from sionmarket.users)::int as users,
          (select count(*) from sionmarket.users where 'restaurante' = any(roles))::int as restaurante,
          (select count(*) from sionmarket.users where 'repartidor' = any(roles))::int as repartidor,
          (select count(*) from sionmarket.users where 'admin' = any(roles))::int as admin`),
      this.db
        .select({ status: orders.status, count: sql<number>`count(*)::int` })
        .from(orders)
        .where(notInArray(orders.status, [...TERMINAL_STATUSES]))
        .groupBy(orders.status),
      this.db.execute<{ id: string; name: string; orders: number; sales: number }>(sql`
        select r.id, r.name, count(*)::int as orders,
          coalesce(sum(o.subtotal_cents - o.product_discount_cents) filter (where o.status not in ('RECHAZADO', 'CANCELADO')), 0)::int as sales
        from sionmarket.orders o join sionmarket.restaurants r on r.id = o.restaurant_id
        where o.created_at >= ${range.from.toISOString()}
        group by r.id, r.name order by 4 desc, 3 desc limit 5`),
      this.countNewRequests(),
    ]);
    const c = counts[0]!;
    const { deliveryCents, ...totals } = current;
    const { deliveryCents: _prev, ...prev } = previous;
    return {
      period,
      totals,
      previous: prev,
      deliveryCents,
      series,
      restaurants: { total: c.restaurants!, enabled: c.enabled!, open: c.open! },
      zones: { total: c.zones!, active: c.active_zones! },
      users: { total: c.users!, restaurante: c.restaurante!, repartidor: c.repartidor!, admin: c.admin! },
      activeOrders: active.map((a) => ({ status: a.status as OrderStatus, count: a.count })),
      pendingRequests,
      topRestaurants: top.map((t) => ({ id: t.id, name: t.name, orders: t.orders, salesCents: t.sales })),
    };
  }

  async restaurants(): Promise<AdminRestaurant[]> {
    const rows = await this.db.execute<{
      id: string;
      name: string;
      category: string;
      logo_url: string | null;
      open: boolean;
      enabled: boolean;
      zone: string | null;
      owner_email: string | null;
      owner: string | null;
      orders30d: number;
      lat: number;
      lng: number;
      created_at: Date;
    }>(sql`
      select r.id, r.name, r.category_id as category, r.logo_url, r.open, r.enabled,
        coalesce(z.name, (select z2.name from sionmarket.zones z2 where ST_Contains(z2.area, r.location) limit 1)) as zone,
        u.email as owner_email,
        case when r.owner_user_id is null then null else coalesce(u.email, u.phone, u.name, 'Cuenta sin datos') end as owner,
        (select count(*) from sionmarket.orders o where o.restaurant_id = r.id and o.created_at >= ${DAYS_30})::int as orders30d,
        ST_Y(r.location) as lat, ST_X(r.location) as lng, r.created_at
      from sionmarket.restaurants r
      left join sionmarket.zones z on z.id = r.zone_id
      left join sionmarket.users u on u.id = r.owner_user_id
      order by r.enabled desc, r.name`);
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      logoUrl: r.logo_url,
      open: r.open,
      enabled: r.enabled,
      zone: r.zone,
      ownerEmail: r.owner_email,
      owner: r.owner,
      orders30d: r.orders30d,
      location: { latitude: Number(r.lat), longitude: Number(r.lng) },
      createdAt: new Date(r.created_at).toISOString(),
    }));
  }

  setEnabled(id: string, enabled: boolean) {
    return this.catalogo.setEnabled(id, enabled);
  }

  /** Gives the restaurant to the account with that email and makes sure it has the restaurant role. */
  async setOwner(id: string, email: string | null) {
    if (!email) return this.catalogo.setOwner(id, null);
    const user = await this.findByEmail(email);
    if (!user.roles.includes('restaurante')) await this.writeRoles(user.id, [...(user.roles as Role[]), 'restaurante']);
    return this.catalogo.setOwner(id, user.id);
  }

  async zones() {
    const rows = await this.db.execute<{
      id: string;
      name: string;
      active: boolean;
      restaurants: number;
      addresses: number;
      orders30d: number;
      ring: [number, number][];
    }>(sql`
      select z.id, z.name, z.active,
        (select count(*) from sionmarket.restaurants r where r.zone_id = z.id or (r.zone_id is null and ST_Contains(z.area, r.location)))::int as restaurants,
        (select count(*) from sionmarket.addresses a where a.zone_id = z.id and a.deleted_at is null)::int as addresses,
        (select count(*) from sionmarket.orders o where o.zone_id = z.id and o.created_at >= ${DAYS_30})::int as orders30d,
        (ST_AsGeoJSON(z.area)::json -> 'coordinates' -> 0) as ring
      from sionmarket.zones z order by z.name`);
    return rows.map((z) => ({
      id: z.id,
      name: z.name,
      active: z.active,
      restaurants: z.restaurants,
      addresses: z.addresses,
      orders30d: z.orders30d,
      area: (z.ring ?? []).map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
    }));
  }

  async setZoneActive(id: string, active: boolean) {
    const [row] = await this.db.update(zones).set({ active }).where(eq(zones.id, id)).returning({ id: zones.id });
    if (!row) throw notFound('La zona');
    return { id, active };
  }

  async users(query: AdminUserQuery): Promise<AdminUser[]> {
    const term = query.q ? `%${query.q}%` : undefined;
    const rows = await this.db
      .select()
      .from(users)
      .where(
        and(
          term ? or(ilike(users.email, term), ilike(users.phone, term), ilike(users.name, term)) : undefined,
          query.rol ? sql`${query.rol} = any(${users.roles})` : undefined,
        ),
      )
      .orderBy(desc(users.createdAt))
      .limit(50);
    const owned = rows.length
      ? await this.db
          .select({ id: restaurants.id, name: restaurants.name, owner: restaurants.ownerUserId })
          .from(restaurants)
          .where(inArray(restaurants.ownerUserId, rows.map((u) => u.id)))
      : [];
    return rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      roles: u.roles as Role[],
      createdAt: u.createdAt.toISOString(),
      restaurants: owned.filter((r) => r.owner === u.id).map((r) => ({ id: r.id, name: r.name })),
    }));
  }

  /** Every account keeps "cliente"; an admin cannot take away their own admin role. */
  async setRoles(actor: AuthUser, id: string, roles: Role[]) {
    if (actor.id === id && !roles.includes('admin')) {
      throw new AppError('VALIDATION', 'No puedes quitarte tu propio acceso de administrador', HttpStatus.CONFLICT);
    }
    const [u] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, id));
    if (!u) throw notFound('El usuario');
    const saved = await this.writeRoles(id, roles);
    return { id, roles: saved };
  }

  async orders(query: AdminOrderQuery): Promise<AdminOrder[]> {
    const terminal = [...TERMINAL_STATUSES];
    const rows = await this.db
      .select({ order: orders, restaurant: restaurants.name, customer: sql<string | null>`coalesce(${users.name}, ${users.email}, ${users.phone})`, zone: zones.name })
      .from(orders)
      .innerJoin(restaurants, eq(restaurants.id, orders.restaurantId))
      .leftJoin(users, eq(users.id, orders.customerId))
      .leftJoin(zones, eq(zones.id, orders.zoneId))
      .where(
        and(
          query.estado === 'activos' ? notInArray(orders.status, terminal) : query.estado === 'terminados' ? inArray(orders.status, terminal) : undefined,
          query.restaurante ? eq(orders.restaurantId, query.restaurante) : undefined,
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(100);
    return rows.map(({ order: o, restaurant, customer, zone }) => ({
      id: o.id,
      code: o.code,
      status: o.status as OrderStatus,
      restaurant: { id: o.restaurantId, name: restaurant },
      customer,
      zone,
      totalCents: o.subtotalCents - o.productDiscountCents + o.deliveryBaseCents - o.deliveryDiscountCents + o.tipCents,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }));
  }

  /** Business sign-ups from the website, newest first. Empty where that table does not exist (tests). */
  async requests(): Promise<BusinessRequest[]> {
    if (!(await this.requestsTableExists())) return [];
    const rows = await this.db.execute<{ row: Record<string, unknown> }>(sql`select to_jsonb(s) as row from ${REQUESTS} s limit 500`);
    return rows
      .map(({ row }) => ({
        id: String(row.id),
        businessName: pick(row, 'nombre_comercio') ?? '',
        sector: pick(row, 'sector'),
        contact: pick(row, 'contacto'),
        phone: pick(row, 'telefono'),
        email: pick(row, 'email'),
        status: pick(row, 'estado') ?? 'nueva',
        createdAt: pick(row, 'created_at', 'creado_en', 'creada_en', 'fecha'),
      }))
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }

  async setRequestStatus(id: string, status: RequestStatus) {
    if (!(await this.requestsTableExists())) throw notFound('La solicitud');
    const rows = await this.db.execute(sql`update ${REQUESTS} set estado = ${status} where id::text = ${id} returning id`);
    if (!rows.length) throw notFound('La solicitud');
    return { id, status };
  }

  private async countNewRequests() {
    if (!(await this.requestsTableExists())) return 0;
    const [row] = await this.db.execute<{ n: number }>(
      sql`select count(*)::int as n from ${REQUESTS} s where coalesce(to_jsonb(s) ->> 'estado', 'nueva') = 'nueva'`,
    );
    return row?.n ?? 0;
  }

  private async requestsTableExists() {
    const [row] = await this.db.execute<{ t: string | null }>(sql`select to_regclass('public.solicitudes_comercio')::text as t`);
    return !!row?.t;
  }

  private async writeRoles(id: string, roles: Role[]) {
    const saved = [...new Set<Role>(['cliente', ...roles])];
    await this.db.update(users).set({ roles: saved }).where(eq(users.id, id));
    this.directory.forget(id);
    return saved;
  }

  /** An account by email: ours, or one that signed up in Supabase Auth but never used the API. */
  private async findByEmail(email: string) {
    const [user] = await this.db.select().from(users).where(ilike(users.email, email));
    if (user) return user;
    const [exists] = await this.db.execute<{ t: string | null }>(sql`select to_regclass('auth.users')::text as t`);
    const found = exists?.t
      ? await this.db.execute<{ id: string; email: string | null; phone: string | null }>(
          sql`select id, email, phone from auth.users where lower(email) = lower(${email}) limit 1`,
        )
      : [];
    const auth = found[0];
    if (!auth) throw new AppError('VALIDATION', 'Ese correo no tiene cuenta en SionMarket: pídele que se registre primero');
    const [created] = await this.db
      .insert(users)
      .values({ id: auth.id, email: auth.email, phone: auth.phone ? `+${auth.phone}` : null })
      .onConflictDoNothing()
      .returning();
    return created ?? (await this.db.select().from(users).where(eq(users.id, auth.id)))[0]!;
  }
}
