import type {
  AdminOrder,
  AdminOrderQuery,
  AdminRestaurant,
  AdminRestaurantInput,
  AdminSummary,
  AdminUser,
  AdminZone,
  BusinessRequest,
  Category,
  Order,
  OrderStatus,
  Product,
  ProductCustomization,
  ProductInput,
  ProductPatch,
  RequestStatus,
  RestaurantDetail,
  RestaurantInput,
  RestaurantPatch,
  RestaurantStats,
  RestaurantSummary,
  Role,
  StatsPeriod,
} from '@sionmarket/contracts';

import { api } from '@/lib/api';

// Restaurant panel: the owner's restaurants, their menu and their incoming orders.
// Admin panel: the whole platform.

export type PanelOrder = Order & { pickupPin: string | null };

export const ACTIVE: OrderStatus[] = ['PENDIENTE', 'ACEPTADO', 'EN_PREPARACION', 'LISTO'];
/** Out of the kitchen: with the rider, delivered, rejected or cancelled. */
export const DONE: OrderStatus[] = ['ENTREGADO_AL_DELIVERY', 'EN_CAMINO', 'LLEGANDO', 'ENTREGADO', 'RECHAZADO', 'CANCELADO'];

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
  /** The panel's view of a restaurant (also when SionMarket paused it). */
  detail: (id: string) => api<RestaurantDetail>('GET', `/yo/restaurantes/${encodeURIComponent(id)}`),
  stats: (id: string, period: StatsPeriod) => api<RestaurantStats>('GET', `/restaurantes/${encodeURIComponent(id)}/resumen?periodo=${period}`),
  create: (input: RestaurantInput) => api<RestaurantDetail>('POST', '/restaurantes', input),
  update: (id: string, patch: RestaurantPatch) => api<RestaurantDetail>('PATCH', `/restaurantes/${encodeURIComponent(id)}`, patch),
  remove: (id: string) => api('DELETE', `/restaurantes/${encodeURIComponent(id)}`),
  setOpen: (id: string, open: boolean) => api('PATCH', `/restaurantes/${encodeURIComponent(id)}/abierto`, { open }),
  orders: (id: string) => api<PanelOrder[]>('GET', `/restaurantes/${encodeURIComponent(id)}/pedidos?estado=${ACTIVE.join(',')}`),
  history: (id: string) => api<PanelOrder[]>('GET', `/restaurantes/${encodeURIComponent(id)}/pedidos?estado=${DONE.join(',')}&recientes=true`),
  move: (orderId: string, status: OrderStatus, reason?: string) => api<Order>('POST', `/pedidos/${orderId}/estado`, { status, reason }),
  addProduct: (id: string, input: ProductInput) => api<Product>('POST', `/restaurantes/${encodeURIComponent(id)}/productos`, input),
  updateProduct: (id: string, productId: string, patch: ProductPatch) =>
    api<Product>('PATCH', `/restaurantes/${encodeURIComponent(id)}/productos/${encodeURIComponent(productId)}`, patch),
  removeProduct: (id: string, productId: string) =>
    api('DELETE', `/restaurantes/${encodeURIComponent(id)}/productos/${encodeURIComponent(productId)}`),
  setCustomization: (id: string, productId: string, input: ProductCustomization) =>
    api<Product>('PUT', `/restaurantes/${encodeURIComponent(id)}/productos/${encodeURIComponent(productId)}/personalizacion`, input),
};

export const admin = {
  summary: (period: StatsPeriod) => api<AdminSummary>('GET', `/admin/resumen?periodo=${period}`),
  restaurants: () => api<AdminRestaurant[]>('GET', '/admin/restaurantes'),
  createRestaurant: (input: AdminRestaurantInput) => api<RestaurantDetail>('POST', '/admin/restaurantes', input),
  setEnabled: (id: string, enabled: boolean) => api('PATCH', `/admin/restaurantes/${encodeURIComponent(id)}/habilitado`, { enabled }),
  setOwner: (id: string, email: string | null) => api('PATCH', `/admin/restaurantes/${encodeURIComponent(id)}/dueno`, { email }),
  zones: () => api<AdminZone[]>('GET', '/admin/zonas'),
  setZoneActive: (id: string, active: boolean) => api('PATCH', `/admin/zonas/${encodeURIComponent(id)}/activa`, { active }),
  users: (q: string, rol?: Role) =>
    api<AdminUser[]>('GET', `/admin/usuarios?${new URLSearchParams({ ...(q ? { q } : {}), ...(rol ? { rol } : {}) }).toString()}`),
  setRoles: (id: string, roles: Role[]) => api<{ roles: Role[] }>('PUT', `/admin/usuarios/${id}/roles`, { roles }),
  orders: (estado: AdminOrderQuery['estado'], restaurante?: string) =>
    api<AdminOrder[]>('GET', `/admin/pedidos?${new URLSearchParams({ estado, ...(restaurante ? { restaurante } : {}) }).toString()}`),
  requests: () => api<BusinessRequest[]>('GET', '/admin/solicitudes'),
  setRequestStatus: (id: string, status: RequestStatus) => api('PATCH', `/admin/solicitudes/${encodeURIComponent(id)}`, { status }),
};

export const PERIODS: { id: StatsPeriod; label: string }[] = [
  { id: 'dia', label: 'Hoy' },
  { id: 'semana', label: '7 días' },
  { id: 'mes', label: '30 días' },
];

/** "Ayer", "7 días antes"… for comparing a period with the one before. */
export const PREVIOUS_LABEL: Record<StatsPeriod, string> = { dia: 'ayer a esta hora', semana: 'los 7 días anteriores', mes: 'los 30 días anteriores' };

/** "3,50" or "3.5" → 350 cents; null when it is not a price. */
export function parseUsd(text: string): number | null {
  const n = Number(text.replace(',', '.').trim());
  return text.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export const centsText = (cents: number) => (cents / 100).toFixed(2);

export const canManage = (roles?: string[]) => !!roles?.some((r) => r === 'restaurante' || r === 'admin');
