import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { PanelLoading, PanelTabs } from '@/components/panel-tabs';
import { useRequireLogin } from '@/lib/auth-gate';
import { MODE_HOME, useMode } from '@/lib/mode';
import { alertNewOrder } from '@/lib/order-alert';
import { followRestaurant } from '@/lib/realtime';
import { negocio, useNegocio } from '@/store/negocio';

// The restaurant's side of the app: what it sold, the orders coming in and its menu.
export default function NegocioLayout() {
  const allowed = useRequireLogin();
  const { mode, rolesKnown } = useMode();
  const { restaurant } = useNegocio();
  const id = restaurant?.id;

  // New orders ring wherever the restaurant is in the panel, not only on the orders tab.
  useEffect(() => {
    if (!id) return;
    return followRestaurant(id, {
      onNew: (e) => {
        alertNewOrder(e.code);
        negocio.touchInbox();
      },
      onStatus: () => negocio.touchInbox(),
    });
  }, [id]);

  if (!allowed) return null;
  // Wait for the account's roles so a stale profile never loads a panel it may not open.
  if (!rolesKnown) return <PanelLoading />;
  if (mode !== 'restaurante') return <Redirect href={MODE_HOME[mode]} />;

  return (
    <PanelTabs
      panel="Restaurante"
      tabs={[
        { name: 'index', title: 'Resumen', icon: 'stats-chart', wide: true },
        { name: 'pedidos', title: 'Pedidos', icon: 'receipt' },
        { name: 'menu', title: 'Menú', icon: 'restaurant' },
        { name: 'local', title: 'Mi local', icon: 'storefront' },
      ]}
    />
  );
}
