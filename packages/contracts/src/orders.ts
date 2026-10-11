import { z } from 'zod';
import { OrderStatus } from './order-status.js';

export const PaymentMethod = z.enum(['pago_movil', 'transferencia', 'tarjeta', 'efectivo']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const CartLineInput = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(50),
  optionIds: z.array(z.string()).max(30).default([]),
  note: z.string().trim().max(140).optional(),
});
export type CartLineInput = z.infer<typeof CartLineInput>;

export const QuoteRequest = z.object({
  restaurantId: z.string(),
  addressId: z.string(),
  lines: z.array(CartLineInput).min(1).max(40),
  tipCents: z.number().int().min(0).max(100_00).default(0),
  couponCode: z.string().trim().max(30).optional(),
});
export type QuoteRequest = z.infer<typeof QuoteRequest>;

export const CreateOrder = QuoteRequest.extend({
  paymentMethod: PaymentMethod,
  generalNote: z.string().trim().max(280).optional(),
});
export type CreateOrder = z.infer<typeof CreateOrder>;

/** Restaurant and platform amounts stay separate: the restaurant bills the food, SionMarket bills delivery. */
export const Totals = z.object({
  subtotalCents: z.number().int(),
  productDiscountCents: z.number().int(),
  restaurantTotalCents: z.number().int(),
  deliveryBaseCents: z.number().int(),
  deliveryDiscountCents: z.number().int(),
  deliveryCents: z.number().int(),
  tipCents: z.number().int(),
  platformTotalCents: z.number().int(),
  totalCents: z.number().int(),
  exchangeRate: z.number(),
  totalVesCents: z.number().int(),
});
export type Totals = z.infer<typeof Totals>;

export const QuoteLine = z.object({
  productId: z.string(),
  name: z.string(),
  quantity: z.number().int(),
  unitCents: z.number().int(),
  lineCents: z.number().int(),
  options: z.array(z.object({ id: z.string(), groupId: z.string(), name: z.string(), priceCents: z.number().int() })),
  note: z.string().nullable(),
});
export type QuoteLine = z.infer<typeof QuoteLine>;

export const Quote = z.object({
  lines: z.array(QuoteLine),
  totals: Totals,
  couponApplied: z.string().nullable(),
  etaMin: z.number().int(),
  etaMax: z.number().int(),
});
export type Quote = z.infer<typeof Quote>;

export const StatusEvent = z.object({
  status: OrderStatus,
  actor: z.string(),
  reason: z.string().nullable(),
  at: z.string(),
});
export type StatusEvent = z.infer<typeof StatusEvent>;

export const Order = z.object({
  id: z.string(),
  code: z.string(),
  status: OrderStatus,
  restaurant: z.object({ id: z.string(), name: z.string() }),
  customerId: z.string(),
  riderId: z.string().nullable(),
  address: z.object({ alias: z.string(), street: z.string(), reference: z.string(), latitude: z.number(), longitude: z.number() }),
  paymentMethod: PaymentMethod,
  generalNote: z.string().nullable(),
  lines: z.array(QuoteLine),
  totals: Totals,
  history: z.array(StatusEvent),
  createdAt: z.string(),
});
export type Order = z.infer<typeof Order>;

export const ChangeStatus = z.object({
  status: OrderStatus,
  reason: z.string().trim().max(200).optional(),
  /** Pickup PIN the rider types when taking the order from the restaurant. */
  pickupPin: z.string().regex(/^\d{4}$/).optional(),
});
export type ChangeStatus = z.infer<typeof ChangeStatus>;
