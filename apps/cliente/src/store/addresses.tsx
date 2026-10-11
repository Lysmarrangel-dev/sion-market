import type { Address as ApiAddress } from '@sionmarket/contracts';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { COVERAGE_ZONE, type LatLng } from '@/data/catalog';
import { api, getSession, onSessionChange, online } from '@/lib/api';
import { insidePolygon } from '@/lib/geo';
import { usePersistentState } from '@/lib/persist';

export type Address = { id: string; alias: string; street: string; reference: string; location: LatLng };

const SEED: Address[] = [
  {
    id: 'casa',
    alias: 'Casa',
    street: 'Av. La Fuente, Res. Los Samanes, apto 4B',
    reference: 'Edificio crema, portón negro. Tocar el intercomunicador 4B.',
    location: { latitude: 10.3412, longitude: -68.7451 },
  },
  {
    id: 'oficina',
    alias: 'Oficina',
    street: 'Calle 10 con av. Libertador, Torre Yaracuy, piso 3',
    reference: 'Entrar por recepción, preguntar por Sionmarket.',
    location: { latitude: 10.3369, longitude: -68.7392 },
  },
];

type State = { list: Address[]; selectedId: string | null };

type Ctx = {
  addresses: Address[];
  selected: Address | null;
  select: (id: string) => void;
  save: (address: Omit<Address, 'id'> & { id?: string }) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const AddressContext = createContext<Ctx | null>(null);

export const inCoverage = (location: LatLng) => insidePolygon(location, COVERAGE_ZONE);

const fromApi = (a: ApiAddress): Address => ({ id: a.id, alias: a.alias, street: a.street, reference: a.reference, location: a.location });

export function AddressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = usePersistentState<State>('addresses', online ? { list: [], selectedId: null } : { list: SEED, selectedId: 'casa' });

  // Online, the server is the source of truth: reload the list whenever the session changes.
  useEffect(() => {
    if (!online) return;
    const load = () => {
      if (!getSession()) return setState({ list: [], selectedId: null });
      api<ApiAddress[]>('GET', '/yo/direcciones')
        .then((list) =>
          setState((prev) => {
            const mapped = list.map(fromApi);
            return { list: mapped, selectedId: mapped.some((a) => a.id === prev.selectedId) ? prev.selectedId : (mapped[0]?.id ?? null) };
          }),
        )
        .catch(() => {});
    };
    load();
    return onSessionChange(load);
  }, [setState]);

  const value = useMemo<Ctx>(
    () => ({
      addresses: state.list,
      selected: state.list.find((a) => a.id === state.selectedId) ?? state.list[0] ?? null,
      select: (id) => setState((prev) => ({ ...prev, selectedId: id })),
      save: async (address) => {
        if (online) {
          // The API has no edit yet: an edited address is replaced by a new one.
          const { id, ...body } = address;
          const created = fromApi(await api<ApiAddress>('POST', '/yo/direcciones', body));
          if (id) await api('DELETE', `/yo/direcciones/${id}`).catch(() => {});
          setState((prev) => ({ list: [...prev.list.filter((a) => a.id !== id), created], selectedId: created.id }));
          return;
        }
        setState((prev) => {
          const id = address.id ?? `dir-${Date.now()}`;
          const exists = prev.list.some((a) => a.id === id);
          const list = exists ? prev.list.map((a) => (a.id === id ? { ...address, id } : a)) : [...prev.list, { ...address, id }];
          return { list, selectedId: id };
        });
      },
      remove: async (id) => {
        if (online) await api('DELETE', `/yo/direcciones/${id}`);
        setState((prev) => {
          const list = prev.list.filter((a) => a.id !== id);
          return { list, selectedId: prev.selectedId === id ? (list[0]?.id ?? null) : prev.selectedId };
        });
      },
    }),
    [state, setState],
  );

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddresses() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error('useAddresses must be used inside AddressProvider');
  return ctx;
}
