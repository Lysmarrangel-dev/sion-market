import { Redirect } from 'expo-router';

import { PanelTabs } from '@/components/panel-tabs';
import { useRequireLogin } from '@/lib/auth-gate';
import { MODE_HOME, useMode } from '@/lib/mode';

// SionMarket's back office: the whole platform and the switches only staff may flip.
export default function AdminLayout() {
  const allowed = useRequireLogin();
  const { mode, rolesKnown } = useMode();
  if (!allowed) return null;
  if (rolesKnown && mode !== 'admin') return <Redirect href={MODE_HOME[mode]} />;
  return (
    <PanelTabs
      panel="Administración"
      tabs={[
        { name: 'index', title: 'Resumen', icon: 'stats-chart', wide: true },
        { name: 'locales', title: 'Locales', icon: 'storefront', wide: true },
        { name: 'pedidos', title: 'Pedidos', icon: 'receipt', wide: true },
        { name: 'zonas', title: 'Zonas', icon: 'map' },
        { name: 'mas', title: 'Más', icon: 'menu' },
      ]}
      hidden={['local', 'usuarios', 'solicitudes']}
    />
  );
}
