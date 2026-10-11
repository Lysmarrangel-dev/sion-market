import type { Order as ApiOrder, PaymentMethod } from '@sionmarket/contracts';
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { getProduct, getRestaurant, RIDER, type LatLng, type Product } from '@/data/catalog';
import { api, getSession, onSessionChange, online } from '@/lib/api';
import { onOrderStatus } from '@/lib/realtime';
import { isActive, MAIN_FLOW, notificationFor, type OrderStatus } from '@/data/order-states';
import { notify } from '@/lib/notify';
import { usePersistentState } from '@/lib/persist';
import type { Address } from '@/store/addresses';
import type { CartLine, CartTotals } from '@/store/cart';

export type StatusEvent = { status: OrderStatus; at: number; actor: string };

export type Order = {
  id: string;
  /** Short code shown to people (SM-XXXXXX). */
  code: string;
  restaurantId: string;
  lines: CartLine[];
  generalNote: string;
  totals: CartTotals;
  couponCode: string | null;
  address: Address;
  payment: string;
  createdAt: number;
  status: OrderStatus;
  // Each transition is logged with time and actor (section 5).
  history: StatusEvent[];
  cancelReason?: string;
  rating?: { food: number; foodComment: string; delivery: number; deliveryComment: string };
  report?: { reason: string; detail: string; at: number };
};

type Ctx = {
  orders: Order[];
  get: (id: string) => Order | undefined;
  place: (order: Omit<Order, 'id' | 'code' | 'createdAt' | 'status' | 'history'>) => Promise<string>;
  cancel: (id: string, reason: string) => Promise<void>;
  rate: (id: string, rating: NonNullable<Order['rating']>) => void;
  report: (id: string, reason: string, detail: string) => void;
};

const OrdersContext = createContext<Ctx | null>(null);

// Demo timing for the simulated restaurant / rider side, until the real panels exist.
const STEP_DELAY: Partial<Record<OrderStatus, number>> = {
  PENDIENTE: 4000,
  ACEPTADO: 4000,
  EN_PREPARACION: 5000,
  LISTO: 4000,
  ENTREGADO_AL_DELIVERY: 4000,
  EN_CAMINO: 9000,
  LLEGANDO: 5000,
};

const ACTOR: Partial<Record<OrderStatus, string>> = {
  ACEPTADO: 'restaurante',
  EN_PREPARACION: 'restaurante',
  LISTO: 'restaurante',
  ENTREGADO_AL_DELIVERY: 'repartidor',
  EN_CAMINO: 'repartidor',
  LLEGANDO: 'geofence',
  ENTREGADO: 'repartidor',
};

const DAY = 24 * 60 * 60 * 1000;

function seedOrders(): Order[] {
  const now = Date.now();
  const make = (id: string, restaurantId: string, ago: number, totalUsd: number, summary: string): Order => ({
    id,
    code: id,
    restaurantId,
    lines: [],
    generalNote: summary,
    totals: {
      subtotalUsd: totalUsd - 1.5,
      productDiscountUsd: 0,
      restaurantTotalUsd: totalUsd - 1.5,
      deliveryBaseUsd: 1.5,
      deliveryDiscountUsd: 0,
      deliveryUsd: 1.5,
      tipUsd: 0,
      platformTotalUsd: 1.5,
      totalUsd,
    },
    couponCode: null,
    address: {
      id: 'casa',
      alias: 'Casa',
      street: 'Av. La Fuente, Res. Los Samanes, apto 4B',
      reference: '',
      location: { latitude: 10.3412, longitude: -68.7451 },
    },
    payment: 'Pago Móvil',
    createdAt: now - ago,
    status: 'ENTREGADO',
    history: [{ status: 'ENTREGADO', at: now - ago, actor: 'repartidor' }],
  });
  return [
    make('SM-1042', 'la-parrilla-yaracuy', DAY, 19.5, 'Sion Burger doble x2, Papas rústicas'),
    make('SM-1017', 'pizzeria-don-nicola', 7 * DAY, 9.8, 'Pizza margarita'),
  ];
}

const PAYMENT_TO_API: Record<string, PaymentMethod> = {
  'Pago Móvil': 'pago_movil',
  Transferencia: 'transferencia',
  Tarjeta: 'tarjeta',
  Efectivo: 'efectivo',
};
const PAYMENT_LABEL = Object.fromEntries(Object.entries(PAYMENT_TO_API).map(([label, id]) => [id, label]));

const usd = (cents: number) => cents / 100;

/** API order → the shape the screens already use. */
function fromApi(o: ApiOrder, local?: Order): Order {
  const lines: CartLine[] = o.lines.map((l, i) => {
    const product: Product = getProduct(l.productId) ?? {
      id: l.productId,
      restaurantId: o.restaurant.id,
      name: l.name,
      description: '',
      priceUsd: usd(l.unitCents - l.options.reduce((sum, x) => sum + x.priceCents, 0)),
      image: '',
      section: '',
    };
    return {
      key: `${l.productId}-${i}`,
      product,
      quantity: l.quantity,
      note: l.note ?? undefined,
      options: l.options.map((x) => ({
        id: x.id,
        name: x.name,
        priceUsd: usd(x.priceCents),
        groupId: x.groupId,
        groupName: product.modifiers?.find((g) => g.id === x.groupId)?.name ?? '',
      })),
    };
  });
  const t = o.totals;
  const last = o.history.at(-1);
  return {
    id: o.id,
    code: o.code,
    restaurantId: o.restaurant.id,
    lines,
    generalNote: o.generalNote ?? '',
    totals: {
      subtotalUsd: usd(t.subtotalCents),
      productDiscountUsd: usd(t.productDiscountCents),
      restaurantTotalUsd: usd(t.restaurantTotalCents),
      deliveryBaseUsd: usd(t.deliveryBaseCents),
      deliveryDiscountUsd: usd(t.deliveryDiscountCents),
      deliveryUsd: usd(t.deliveryCents),
      tipUsd: usd(t.tipCents),
      platformTotalUsd: usd(t.platformTotalCents),
      totalUsd: usd(t.totalCents),
    },
    couponCode: null,
    address: {
      id: `pedido-${o.id}`,
      alias: o.address.alias,
      street: o.address.street,
      reference: o.address.reference,
      location: { latitude: o.address.latitude, longitude: o.address.longitude },
    },
    payment: PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod,
    createdAt: Date.parse(o.createdAt),
    status: o.status,
    history: o.history.map((h) => ({ status: h.status, at: Date.parse(h.at), actor: h.actor })),
    cancelReason: last && (last.status === 'CANCELADO' || last.status === 'RECHAZADO') ? (last.reason ?? undefined) : undefined,
    // Rating and reports stay on the device until the post-sale module exists.
    rating: local?.rating,
    report: local?.report,
  };
}

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders, hydrated] = usePersistentState<Order[]>('orders', online ? [] : seedOrders());

  const upsert = (order: ApiOrder) =>
    setOrders((prev) => {
      const local = prev.find((o) => o.id === order.id);
      const mapped = fromApi(order, local);
      return local ? prev.map((o) => (o.id === order.id ? mapped : o)) : [mapped, ...prev];
    });

  // Online: load the history on sign-in and apply every status change pushed over the socket.
  useEffect(() => {
    if (!online) return;
    const load = () => {
      if (!getSession()) return setOrders([]);
      api<ApiOrder[]>('GET', '/pedidos')
        .then((list) => setOrders((prev) => list.map((o) => fromApi(o, prev.find((p) => p.id === o.id)))))
        .catch(() => {});
    };
    load();
    let stopListening = onOrderStatus(handleStatus);
    const stopSession = onSessionChange(() => {
      load();
      stopListening();
      stopListening = onOrderStatus(handleStatus);
    });
    async function handleStatus(e: { orderId: string; status: OrderStatus; reason: string | null }) {
      const order = await api<ApiOrder>('GET', `/pedidos/${e.orderId}`).catch(() => null);
      if (!order) return;
      upsert(order);
      const restaurant = getRestaurant(order.restaurant.id);
      const n = notificationFor(e.status, {
        restaurant: order.restaurant.name,
        rider: RIDER.name.split(' ')[0],
        prepMin: restaurant ? restaurant.etaMin - 10 : 15,
        reason: e.reason ?? undefined,
      });
      notify(n.title, n.body);
    }
    return () => {
      stopListening();
      stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latest = useRef(orders);
  useEffect(() => {
    latest.current = orders;
  }, [orders]);

  const transition = (id: string, status: OrderStatus, actor: string, cancelReason?: string) => {
    const order = latest.current.find((o) => o.id === id);
    if (!order || order.status === status) return;
    const restaurant = getRestaurant(order.restaurantId);
    const n = notificationFor(status, {
      restaurant: restaurant?.name ?? 'El restaurante',
      rider: RIDER.name.split(' ')[0],
      prepMin: restaurant ? restaurant.etaMin - 10 : 15,
      reason: cancelReason,
    });
    notify(n.title, n.body);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, status, cancelReason, history: [...o.history, { status, at: Date.now(), actor }] } : o,
      ),
    );
  };

  // Demo mode only: simulate the restaurant and rider moving the active order forward.
  const active = orders.find((o) => isActive(o.status));
  useEffect(() => {
    if (online || !hydrated || !active) return;
    const delay = STEP_DELAY[active.status];
    if (delay == null) return;
    const next = MAIN_FLOW[MAIN_FLOW.indexOf(active.status) + 1];
    const t = setTimeout(() => transition(active.id, next, ACTOR[next] ?? 'sistema'), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, active?.id, active?.status]);

  const value = useMemo<Ctx>(
    () => ({
      orders,
      get: (id) => orders.find((o) => o.id === id),
      place: async (order) => {
        if (online) {
          const created = await api<ApiOrder>('POST', '/pedidos', {
            restaurantId: order.restaurantId,
            addressId: order.address.id,
            lines: order.lines.map((l) => ({
              productId: l.product.id,
              quantity: l.quantity,
              optionIds: l.options.map((o) => o.id),
              note: l.note || undefined,
            })),
            tipCents: Math.round(order.totals.tipUsd * 100),
            couponCode: order.couponCode ?? undefined,
            paymentMethod: PAYMENT_TO_API[order.payment] ?? 'efectivo',
            generalNote: order.generalNote || undefined,
          });
          upsert(created);
          return created.id;
        }
        const id = `SM-${1043 + orders.filter((o) => o.lines.length).length}`;
        const restaurant = getRestaurant(order.restaurantId);
        const created: Order = {
          ...order,
          id,
          code: id,
          createdAt: Date.now(),
          status: 'PENDIENTE',
          history: [{ status: 'PENDIENTE', at: Date.now(), actor: 'consumidor' }],
        };
        setOrders((prev) => [created, ...prev]);
        const n = notificationFor('PENDIENTE', { restaurant: restaurant?.name ?? '', rider: '', prepMin: 0 });
        notify(n.title, n.body);
        return id;
      },
      cancel: async (id, reason) => {
        if (online) {
          upsert(await api<ApiOrder>('POST', `/pedidos/${id}/estado`, { status: 'CANCELADO', reason }));
          return;
        }
        transition(id, 'CANCELADO', 'consumidor', reason);
      },
      rate: (id, rating) => setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, rating } : o))),
      report: (id, reason, detail) =>
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, report: { reason, detail, at: Date.now() } } : o))),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders],
  );

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used inside OrdersProvider');
  return ctx;
}

// Rider position for the live map: restaurant → customer once the rider has the order.
export function riderProgress(order: Order): number {
  const pickedAt = order.history.find((h) => h.status === 'ENTREGADO_AL_DELIVERY')?.at;
  if (!pickedAt) return 0;
  if (order.status === 'ENTREGADO') return 1;
  const total = (STEP_DELAY.ENTREGADO_AL_DELIVERY ?? 0) + (STEP_DELAY.EN_CAMINO ?? 0) + (STEP_DELAY.LLEGANDO ?? 0);
  return Math.min(0.97, (Date.now() - pickedAt) / total);
}

export type { LatLng };
