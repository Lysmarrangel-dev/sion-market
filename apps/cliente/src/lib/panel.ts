import type {
  Category,
  Order,
  OrderStatus,
  Product,
  ProductInput,
  ProductPatch,
  RestaurantDetail,
  RestaurantInput,
  RestaurantPatch,
  RestaurantSummary,
} from '@sionmarket/contracts';

import { api } from '@/lib/api';

// Restaurant panel: the owner's restaurants, their menu and their incoming orders.

export type PanelOrder = Order & { pickupPin: string | null };

export const ACTIVE: OrderStatus[] = ['PENDIENTE', 'ACEPTADO', 'EN_PREPARACION', 'LISTO'];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDIENTE: 'Nuevo',
  ACEPTADO: 'Aceptado',
  RECHAZADO: 'Rechazado',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo para retirar',
  ENTREGADO_AL_DELIVERY: 'Con el repartidor',
  EN_CAMINO: 'En camino',
  LLEGANDO: 'Llegando',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

/** Button text for each move the restaurant can make. */
export const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  ACEPTADO: 'Aceptar',
  RECHAZADO: 'Rechazar',
  EN_PREPARACION: 'Empezar a preparar',
  LISTO: 'Marcar listo',
};

export const panel = {
  mine: () => api<RestaurantSummary[]>('GET', '/yo/restaurantes'),
  categories: () => api<Category[]>('GET', '/categorias'),
  detail: (id: string) => api<RestaurantDetail>('GET', `/restaurantes/${encodeURIComponent(id)}`),
  create: (input: RestaurantInput) => api<RestaurantDetail>('POST', '/restaurantes', input),
  update: (id: string, patch: RestaurantPatch) => api<RestaurantDetail>('PATCH', `/restaurantes/${encodeURIComponent(id)}`, patch),
  remove: (id: string) => api('DELETE', `/restaurantes/${encodeURIComponent(id)}`),
  setOpen: (id: string, open: boolean) => api('PATCH', `/restaurantes/${encodeURIComponent(id)}/abierto`, { open }),
  orders: (id: string) => api<PanelOrder[]>('GET', `/restaurantes/${encodeURIComponent(id)}/pedidos?estado=${ACTIVE.join(',')}`),
  move: (orderId: string, status: OrderStatus, reason?: string) => api<Order>('POST', `/pedidos/${orderId}/estado`, { status, reason }),
  addProduct: (id: string, input: ProductInput) => api<Product>('POST', `/restaurantes/${encodeURIComponent(id)}/productos`, input),
  updateProduct: (id: string, productId: string, patch: ProductPatch) =>
    api<Product>('PATCH', `/restaurantes/${encodeURIComponent(id)}/productos/${encodeURIComponent(productId)}`, patch),
  removeProduct: (id: string, productId: string) =>
    api('DELETE', `/restaurantes/${encodeURIComponent(id)}/productos/${encodeURIComponent(productId)}`),
};

/** "3,50" or "3.5" → 350 cents; null when it is not a price. */
export function parseUsd(text: string): number | null {
  const n = Number(text.replace(',', '.').trim());
  return text.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export const centsText = (cents: number) => (cents / 100).toFixed(2);

export const canManage = (roles?: string[]) => !!roles?.some((r) => r === 'restaurante' || r === 'admin');
