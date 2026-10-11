import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { findCoupon, getRestaurant, type ModifierOption, type Product } from '@/data/catalog';
import { online } from '@/lib/api';
import { usePersistentState } from '@/lib/persist';

export type SelectedOption = ModifierOption & { groupId: string; groupName: string };

export type CartLine = {
  key: string;
  product: Product;
  quantity: number;
  options: SelectedOption[];
  note?: string;
};

type CartState = { lines: CartLine[]; generalNote: string; tipUsd: number; couponCode: string | null };

const EMPTY: CartState = { lines: [], generalNote: '', tipUsd: 0, couponCode: null };

export type CartTotals = {
  subtotalUsd: number;
  productDiscountUsd: number;
  restaurantTotalUsd: number;
  deliveryBaseUsd: number;
  deliveryDiscountUsd: number;
  deliveryUsd: number;
  tipUsd: number;
  platformTotalUsd: number;
  totalUsd: number;
};

type CartContextValue = CartState &
  CartTotals & {
    restaurantId: string | null;
    count: number;
    add: (line: Omit<CartLine, 'key'>) => void;
    setQuantity: (key: string, quantity: number) => void;
    setGeneralNote: (note: string) => void;
    setTip: (usd: number) => void;
    applyCoupon: (code: string) => boolean;
    removeCoupon: () => void;
    clear: () => void;
  };

const CartContext = createContext<CartContextValue | null>(null);

export const unitPrice = (line: Pick<CartLine, 'product' | 'options'>) =>
  line.product.priceUsd + line.options.reduce((sum, o) => sum + o.priceUsd, 0);

export const lineTotal = (line: CartLine) => unitPrice(line) * line.quantity;

const round = (n: number) => Math.round(n * 100) / 100;

// Restaurant and platform amounts stay separate through the whole flow (doc section 1).
export function computeTotals(state: CartState): CartTotals {
  const subtotalUsd = state.lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const restaurant = state.lines[0] ? getRestaurant(state.lines[0].product.restaurantId) : undefined;
  const coupon = state.couponCode ? findCoupon(state.couponCode) : undefined;
  const deliveryBaseUsd = restaurant && state.lines.length ? restaurant.deliveryUsd : 0;
  const productDiscountUsd = coupon?.target === 'productos' ? round((subtotalUsd * coupon.percent) / 100) : 0;
  const deliveryDiscountUsd = coupon?.target === 'delivery' ? round((deliveryBaseUsd * coupon.percent) / 100) : 0;
  const restaurantTotalUsd = subtotalUsd - productDiscountUsd;
  const deliveryUsd = deliveryBaseUsd - deliveryDiscountUsd;
  const tipUsd = state.lines.length ? state.tipUsd : 0;
  const platformTotalUsd = deliveryUsd + tipUsd;
  return {
    subtotalUsd,
    productDiscountUsd,
    restaurantTotalUsd,
    deliveryBaseUsd,
    deliveryDiscountUsd,
    deliveryUsd,
    tipUsd,
    platformTotalUsd,
    totalUsd: restaurantTotalUsd + platformTotalUsd,
  };
}

const lineKey = (line: Omit<CartLine, 'key'>) =>
  `${line.product.id}:${line.options.map((o) => o.id).sort().join(',')}:${line.note ?? ''}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = usePersistentState<CartState>(online ? 'carrito' : 'cart', EMPTY);

  const value = useMemo<CartContextValue>(
    () => ({
      ...state,
      ...computeTotals(state),
      restaurantId: state.lines[0]?.product.restaurantId ?? null,
      count: state.lines.reduce((sum, l) => sum + l.quantity, 0),
      // Callers confirm with the user before adding from another restaurant (RF-C04); this replaces the cart.
      add: (line) =>
        setState((prev) => {
          const switching = prev.lines.length > 0 && prev.lines[0].product.restaurantId !== line.product.restaurantId;
          const base = switching ? { ...EMPTY } : prev;
          const key = lineKey(line);
          const existing = base.lines.find((l) => l.key === key);
          const lines = existing
            ? base.lines.map((l) => (l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l))
            : [...base.lines, { ...line, key }];
          return { ...base, lines };
        }),
      setQuantity: (key, quantity) =>
        setState((prev) => {
          const lines =
            quantity <= 0 ? prev.lines.filter((l) => l.key !== key) : prev.lines.map((l) => (l.key === key ? { ...l, quantity } : l));
          return lines.length ? { ...prev, lines } : { ...EMPTY };
        }),
      setGeneralNote: (generalNote) => setState((prev) => ({ ...prev, generalNote })),
      setTip: (tipUsd) => setState((prev) => ({ ...prev, tipUsd: Math.max(0, tipUsd) })),
      applyCoupon: (code) => {
        const coupon = findCoupon(code);
        if (coupon) setState((prev) => ({ ...prev, couponCode: coupon.code }));
        return !!coupon;
      },
      removeCoupon: () => setState((prev) => ({ ...prev, couponCode: null })),
      clear: () => setState({ ...EMPTY }),
    }),
    [state, setState],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
