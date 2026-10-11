import { sql } from 'drizzle-orm';
import {
  bigserial,
  boolean,
  customType,
  geometry,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// Tables are grouped by the module that owns them. A module reads another module's
// tables only through that module's service.

/** PostGIS polygon in WGS84; written and read as WKT through ST_* functions in queries. */
const polygon = customType<{ data: string }>({ dataType: () => 'geometry(Polygon,4326)' });

const point = (name: string) => geometry(name, { type: 'point', mode: 'xy', srid: 4326 });

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

// ── identidad ──────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull().unique(),
  name: text('name'),
  email: text('email'),
  photoUrl: text('photo_url'),
  roles: text('roles').array().notNull().default(sql`'{cliente}'`),
  createdAt: createdAt(),
});

export const otpCodes = pgTable(
  'otp_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phone: text('phone').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('otp_phone_created_idx').on(t.phone, t.createdAt)],
);

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: createdAt(),
});

// ── cobertura ──────────────────────────────────────────────────────────────
export const zones = pgTable('zones', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  area: polygon('area').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
});

export const coverageWaitlist = pgTable('coverage_waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  location: point('location').notNull(),
  createdAt: createdAt(),
});

// ── usuarios ───────────────────────────────────────────────────────────────
export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    alias: text('alias').notNull(),
    street: text('street').notNull(),
    reference: text('reference').notNull(),
    location: point('location').notNull(),
    zoneId: text('zone_id').references(() => zones.id),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('addresses_user_idx').on(t.userId)],
);

export const deviceTokens = pgTable(
  'device_tokens',
  {
    token: text('token').primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('device_tokens_user_idx').on(t.userId)],
);

// ── catalogo ───────────────────────────────────────────────────────────────
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  sort: integer('sort').notNull().default(0),
});

export const restaurants = pgTable(
  'restaurants',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    categoryId: text('category_id').notNull().references(() => categories.id),
    tags: text('tags').array().notNull().default(sql`'{}'`),
    rating: numeric('rating', { precision: 2, scale: 1, mode: 'number' }).notNull().default(0),
    reviews: integer('reviews').notNull().default(0),
    etaMin: integer('eta_min').notNull(),
    etaMax: integer('eta_max').notNull(),
    deliveryCents: integer('delivery_cents').notNull(),
    minimumCents: integer('minimum_cents').notNull().default(0),
    priceLevel: integer('price_level').notNull().default(2),
    imageUrl: text('image_url'),
    logoUrl: text('logo_url'),
    promo: text('promo'),
    address: text('address').notNull(),
    schedule: text('schedule').notNull(),
    location: point('location').notNull(),
    open: boolean('open').notNull().default(true),
    recommended: integer('recommended').notNull().default(100),
    zoneId: text('zone_id').references(() => zones.id),
    ownerUserId: uuid('owner_user_id').references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index('restaurants_category_idx').on(t.categoryId)],
);

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    restaurantId: text('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
    section: text('section').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    priceCents: integer('price_cents').notNull(),
    imageUrl: text('image_url'),
    popular: boolean('popular').notNull().default(false),
    soldOut: boolean('sold_out').notNull().default(false),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [index('products_restaurant_idx').on(t.restaurantId)],
);

export const modifierGroups = pgTable('modifier_groups', {
  id: text('id').primaryKey(),
  restaurantId: text('restaurant_id').notNull().references(() => restaurants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  required: boolean('required').notNull().default(false),
  min: integer('min').notNull().default(0),
  max: integer('max').notNull().default(1),
});

export const modifierOptions = pgTable('modifier_options', {
  id: text('id').primaryKey(),
  groupId: text('group_id').notNull().references(() => modifierGroups.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  priceCents: integer('price_cents').notNull().default(0),
  sort: integer('sort').notNull().default(0),
});

export const productModifierGroups = pgTable(
  'product_modifier_groups',
  {
    productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    groupId: text('group_id').notNull().references(() => modifierGroups.id, { onDelete: 'cascade' }),
    sort: integer('sort').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.groupId] })],
);

// ── precios ────────────────────────────────────────────────────────────────
export const coupons = pgTable('coupons', {
  code: text('code').primaryKey(),
  label: text('label').notNull(),
  target: text('target', { enum: ['productos', 'delivery'] }).notNull(),
  percent: integer('percent').notNull(),
  active: boolean('active').notNull().default(true),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export const exchangeRates = pgTable('exchange_rates', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  rate: numeric('rate', { precision: 12, scale: 4, mode: 'number' }).notNull(),
  source: text('source').notNull(),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── pedidos ────────────────────────────────────────────────────────────────
export type AddressSnapshot = { alias: string; street: string; reference: string; latitude: number; longitude: number };
export type OptionSnapshot = { id: string; groupId: string; name: string; priceCents: number };

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    customerId: uuid('customer_id').notNull().references(() => users.id),
    restaurantId: text('restaurant_id').notNull().references(() => restaurants.id),
    riderId: uuid('rider_id').references(() => users.id),
    status: text('status').notNull(),
    address: jsonb('address').$type<AddressSnapshot>().notNull(),
    zoneId: text('zone_id').references(() => zones.id),
    paymentMethod: text('payment_method').notNull(),
    generalNote: text('general_note'),
    couponCode: text('coupon_code'),
    subtotalCents: integer('subtotal_cents').notNull(),
    productDiscountCents: integer('product_discount_cents').notNull(),
    deliveryBaseCents: integer('delivery_base_cents').notNull(),
    deliveryDiscountCents: integer('delivery_discount_cents').notNull(),
    tipCents: integer('tip_cents').notNull(),
    exchangeRate: numeric('exchange_rate', { precision: 12, scale: 4, mode: 'number' }).notNull(),
    pickupPin: text('pickup_pin').notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('orders_customer_idx').on(t.customerId, t.createdAt),
    index('orders_restaurant_status_idx').on(t.restaurantId, t.status),
    index('orders_rider_idx').on(t.riderId),
  ],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    productId: text('product_id').notNull(),
    name: text('name').notNull(),
    quantity: integer('quantity').notNull(),
    unitCents: integer('unit_cents').notNull(),
    options: jsonb('options').$type<OptionSnapshot[]>().notNull(),
    note: text('note'),
  },
  (t) => [index('order_items_order_idx').on(t.orderId)],
);

/** Append-only log of every status change (who, when, why). */
export const orderStatusEvents = pgTable(
  'order_status_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    actor: text('actor').notNull(),
    actorUserId: uuid('actor_user_id'),
    reason: text('reason'),
    createdAt: createdAt(),
  },
  (t) => [index('order_status_events_order_idx').on(t.orderId, t.id)],
);

// ── eventos (outbox) ───────────────────────────────────────────────────────
/**
 * Written in the same transaction as the change that caused it, so no event is lost.
 * The worker (step 2) reads pending rows and fans them out: push, realtime, invoices.
 */
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    type: text('type').notNull(),
    aggregateId: text('aggregate_id').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: createdAt(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (t) => [index('outbox_pending_idx').on(t.id).where(sql`processed_at is null`)],
);
