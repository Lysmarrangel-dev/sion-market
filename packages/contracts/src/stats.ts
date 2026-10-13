import { z } from 'zod';
import { RestaurantInput } from './catalog.js';
import { LatLng } from './geo.js';
import { OrderStatus } from './order-status.js';
import { Role } from './roles.js';

// Dashboards: the restaurant's own numbers and the platform-wide view for admins.
// Days are counted in Venezuela's time (America/Caracas).

export const StatsPeriod = z.enum(['dia', 'semana', 'mes']);
export type StatsPeriod = z.infer<typeof StatsPeriod>;

export const StatsQuery = z.object({ periodo: StatsPeriod.default('dia') });
export type StatsQuery = z.infer<typeof StatsQuery>;

/** One bar of a chart: an hour of the day, or a day of the week/month. */
export const StatsPoint = z.object({ label: z.string(), orders: z.number().int(), salesCents: z.number().int() });
export type StatsPoint = z.infer<typeof StatsPoint>;

export const PeriodTotals = z.object({
  /** Orders placed in the period, whatever happened to them. */
  orders: z.number().int(),
  delivered: z.number().int(),
  /** Rejected by the restaurant or expired without an answer. */
  rejected: z.number().int(),
  cancelled: z.number().int(),
  /** Food sales (what the restaurant charges) of orders that were not rejected or cancelled. */
  salesCents: z.number().int(),
  avgTicketCents: z.number().int(),
});
export type PeriodTotals = z.infer<typeof PeriodTotals>;

export const RestaurantStats = z.object({
  period: StatsPeriod,
  from: z.string(),
  totals: PeriodTotals,
  /** Same totals for the period just before, to compare. */
  previous: PeriodTotals,
  /** Orders waiting for the restaurant right now. */
  pending: z.number().int(),
  /** Median minutes from order to acceptance. */
  acceptMinutes: z.number().nullable(),
  series: z.array(StatsPoint),
  topProducts: z.array(z.object({ name: z.string(), quantity: z.number().int(), salesCents: z.number().int() })),
});
export type RestaurantStats = z.infer<typeof RestaurantStats>;

// ── Administración ──
export const AdminSummary = z.object({
  period: StatsPeriod,
  totals: PeriodTotals,
  previous: PeriodTotals,
  /** Delivery fees + tips of the period's valid orders. */
  deliveryCents: z.number().int(),
  series: z.array(StatsPoint),
  restaurants: z.object({ total: z.number().int(), enabled: z.number().int(), open: z.number().int() }),
  zones: z.object({ total: z.number().int(), active: z.number().int() }),
  users: z.object({ total: z.number().int(), restaurante: z.number().int(), repartidor: z.number().int(), admin: z.number().int() }),
  activeOrders: z.array(z.object({ status: OrderStatus, count: z.number().int() })),
  pendingRequests: z.number().int(),
  topRestaurants: z.array(z.object({ id: z.string(), name: z.string(), orders: z.number().int(), salesCents: z.number().int() })),
});
export type AdminSummary = z.infer<typeof AdminSummary>;

export const AdminRestaurant = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  logoUrl: z.string().nullable(),
  open: z.boolean(),
  enabled: z.boolean(),
  zone: z.string().nullable(),
  ownerEmail: z.string().nullable(),
  /** How to name the owner: email, else phone or name; null when nobody owns it. */
  owner: z.string().nullable(),
  /** Orders in the last 30 days. */
  orders30d: z.number().int(),
  location: LatLng,
  createdAt: z.string(),
});
export type AdminRestaurant = z.infer<typeof AdminRestaurant>;

export const AdminZone = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  restaurants: z.number().int(),
  addresses: z.number().int(),
  /** Orders in the last 30 days. */
  orders30d: z.number().int(),
  area: z.array(LatLng),
});
export type AdminZone = z.infer<typeof AdminZone>;

export const AdminUser = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  roles: z.array(Role),
  createdAt: z.string(),
  restaurants: z.array(z.object({ id: z.string(), name: z.string() })),
});
export type AdminUser = z.infer<typeof AdminUser>;

export const AdminUserQuery = z.object({ q: z.string().trim().max(80).optional(), rol: Role.optional() });
export type AdminUserQuery = z.infer<typeof AdminUserQuery>;

export const SetRoles = z.object({ roles: z.array(Role).min(1) });
export type SetRoles = z.infer<typeof SetRoles>;

export const SetEnabled = z.object({ enabled: z.boolean() });
export type SetEnabled = z.infer<typeof SetEnabled>;

export const SetActive = z.object({ active: z.boolean() });
export type SetActive = z.infer<typeof SetActive>;

/** Owner by email (the account must have signed up), or null to leave it without owner. */
export const SetOwner = z.object({ email: z.email().nullable() });
export type SetOwner = z.infer<typeof SetOwner>;

/** An admin registering a restaurant for someone: it belongs to that account from the start. */
export const AdminRestaurantInput = RestaurantInput.and(z.object({ ownerEmail: z.email('Escribe el correo de la cuenta del dueño') }));
export type AdminRestaurantInput = z.infer<typeof AdminRestaurantInput>;

export const AdminOrderQuery = z.object({
  estado: z.enum(['activos', 'terminados', 'todos']).default('activos'),
  restaurante: z.string().optional(),
});
export type AdminOrderQuery = z.infer<typeof AdminOrderQuery>;

export const AdminOrder = z.object({
  id: z.string(),
  code: z.string(),
  status: OrderStatus,
  restaurant: z.object({ id: z.string(), name: z.string() }),
  customer: z.string().nullable(),
  zone: z.string().nullable(),
  totalCents: z.number().int(),
  paymentMethod: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminOrder = z.infer<typeof AdminOrder>;

/** A business that filled the "Registra tu comercio" form on the website. */
export const BusinessRequest = z.object({
  id: z.string(),
  businessName: z.string(),
  sector: z.string().nullable(),
  contact: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  status: z.string(),
  createdAt: z.string().nullable(),
});
export type BusinessRequest = z.infer<typeof BusinessRequest>;

export const RequestStatus = z.enum(['nueva', 'contactada', 'afiliada', 'descartada']);
export type RequestStatus = z.infer<typeof RequestStatus>;

export const SetRequestStatus = z.object({ status: RequestStatus });
export type SetRequestStatus = z.infer<typeof SetRequestStatus>;
