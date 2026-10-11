import { z } from 'zod';
import type { Actor } from './roles.js';

// Order states from section 5 of the requirements document.
export const OrderStatus = z.enum([
  'PENDIENTE',
  'ACEPTADO',
  'RECHAZADO',
  'EN_PREPARACION',
  'LISTO',
  'ENTREGADO_AL_DELIVERY',
  'EN_CAMINO',
  'LLEGANDO',
  'ENTREGADO',
  'CANCELADO',
]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const TERMINAL_STATUSES: readonly OrderStatus[] = ['ENTREGADO', 'CANCELADO', 'RECHAZADO'];

export const isTerminal = (s: OrderStatus) => TERMINAL_STATUSES.includes(s);

/**
 * Allowed transitions and who may trigger each one. The backend enforces this table;
 * apps read it only to decide which buttons to show.
 */
export const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, readonly Actor[]>>> = {
  PENDIENTE: {
    ACEPTADO: ['restaurante'],
    RECHAZADO: ['restaurante', 'sistema'],
    CANCELADO: ['cliente', 'admin', 'sistema'],
  },
  ACEPTADO: {
    EN_PREPARACION: ['restaurante'],
    CANCELADO: ['cliente', 'admin'],
  },
  EN_PREPARACION: {
    LISTO: ['restaurante'],
    CANCELADO: ['admin'],
  },
  LISTO: {
    ENTREGADO_AL_DELIVERY: ['repartidor'],
    CANCELADO: ['admin'],
  },
  ENTREGADO_AL_DELIVERY: {
    EN_CAMINO: ['repartidor'],
    CANCELADO: ['admin'],
  },
  EN_CAMINO: {
    LLEGANDO: ['repartidor', 'sistema'],
    ENTREGADO: ['repartidor'],
    CANCELADO: ['admin'],
  },
  LLEGANDO: {
    ENTREGADO: ['repartidor'],
    CANCELADO: ['admin'],
  },
  ENTREGADO: {},
  CANCELADO: {},
  RECHAZADO: {},
};

export function canTransition(from: OrderStatus, to: OrderStatus, actor: Actor): boolean {
  return TRANSITIONS[from][to]?.includes(actor) ?? false;
}

/** Next states the given actor may move the order to. */
export function nextStatusesFor(from: OrderStatus, actor: Actor): OrderStatus[] {
  return (Object.entries(TRANSITIONS[from]) as [OrderStatus, readonly Actor[]][])
    .filter(([, actors]) => actors.includes(actor))
    .map(([to]) => to);
}
