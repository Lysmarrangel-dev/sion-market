import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RestaurantDetail, RestaurantSummary } from '@sionmarket/contracts';
import { useEffect, useSyncExternalStore } from 'react';

import { ApiRequestError, onSessionChange } from '@/lib/api';
import { panel } from '@/lib/panel';

// The restaurant the business panel is working on. An owner with several picks one; the
// choice is remembered on this device.

type State = {
  status: 'idle' | 'loading' | 'ready' | 'denied' | 'error';
  list: RestaurantSummary[];
  restaurant: RestaurantDetail | null;
  error: string | null;
  /** Bumped by the realtime alerts whenever an order arrives or moves; screens reload on it. */
  inbox: number;
};

const KEY = 'sionmarket:negocio-local';
let state: State = { status: 'idle', list: [], restaurant: null, error: null, inbox: 0 };
const listeners = new Set<() => void>();

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

async function load(preferred?: string) {
  if (state.status === 'idle') set({ status: 'loading' });
  try {
    const list = await panel.mine();
    const saved = preferred ?? state.restaurant?.id ?? (await AsyncStorage.getItem(KEY).catch(() => null));
    const id = list.find((r) => r.id === saved)?.id ?? list[0]?.id;
    const restaurant = id ? await panel.detail(id) : null;
    if (id) AsyncStorage.setItem(KEY, id).catch(() => {});
    set({ status: 'ready', list, restaurant, error: null });
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 403) set({ status: 'denied', error: null });
    else set({ status: state.restaurant ? 'ready' : 'error', error: (e as Error).message });
  }
}

export const negocio = {
  /** Reloads the list and the current restaurant (after an edit). */
  reload: () => load(),
  /** Switches to another of the owner's restaurants. */
  select: (id: string) => load(id),
  /** Applies a change locally without waiting for a reload (open switch, sold out…). */
  patch: (fn: (r: RestaurantDetail) => RestaurantDetail) => state.restaurant && set({ restaurant: fn(state.restaurant) }),
  /** Something happened to an order of this restaurant. */
  touchInbox: () => set({ inbox: state.inbox + 1 }),
  /** Forget the choice when the account signs out. */
  clear: () => {
    AsyncStorage.removeItem(KEY).catch(() => {});
    set({ status: 'idle', list: [], restaurant: null, error: null, inbox: 0 });
  },
};

export function useNegocio() {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
  useEffect(() => {
    if (state.status === 'idle') void load();
  }, []);
  return snapshot;
}

onSessionChange((s) => {
  if (!s && state.status !== 'idle') negocio.clear();
});
