import { z } from 'zod';
import { LatLng } from './geo.js';
import { OrderStatus } from './order-status.js';

// WebSocket contract (Socket.IO, path /ws). The client authenticates with
// `auth: { token: <accessToken> }` and is joined to its own user room automatically.

/** Client → server: follow one order (customer, restaurant, rider, admin) or a restaurant inbox. */
export const Subscribe = z.union([z.object({ orderId: z.uuid() }), z.object({ restaurantId: z.string() })]);
export type Subscribe = z.infer<typeof Subscribe>;

/** Client → server, rider app only: current position every few seconds. */
export const RiderLocation = LatLng.extend({ heading: z.number().min(0).max(360).optional() });
export type RiderLocation = z.infer<typeof RiderLocation>;

export const OrderStatusEvent = z.object({
  orderId: z.string(),
  code: z.string(),
  status: OrderStatus,
  reason: z.string().nullable(),
  at: z.string(),
});
export type OrderStatusEvent = z.infer<typeof OrderStatusEvent>;

export const RiderPosition = LatLng.extend({ orderId: z.string(), riderId: z.string(), at: z.string() });
export type RiderPosition = z.infer<typeof RiderPosition>;

/** Server → client event names. */
export const RT = {
  /** To the order room, the customer and the restaurant. */
  orderStatus: 'pedido.estado',
  /** To the restaurant inbox when a new order arrives. */
  orderNew: 'pedido.nuevo',
  /** To the rider when an order is assigned to them. */
  orderAssigned: 'pedido.asignado',
  /** To the order room while the rider is on the way. */
  riderPosition: 'repartidor.ubicacion',
} as const;
