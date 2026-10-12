import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { ScreenFrame } from '@/components/screen-frame';
import { WebNav } from '@/components/web-nav';
import { Colors, Fonts } from '@/constants/theme';
import { online } from '@/lib/api';
import { useLayout } from '@/lib/layout';
import { MODE_HOME, useMode } from '@/lib/mode';
import { useSession } from '@/lib/session';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, active: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? active : name} size={24} color={color} />;
  };
}

// Home and search lay out their own wide content; orders and profile read best as a column.
const WIDE_SCREENS = new Set(['index', 'buscar']);

export default function TabsLayout() {
  const { wide } = useLayout();
  const { mode } = useMode();
  const session = useSession();
  // Restaurants and admins are not here to order: send them to their panel.
  if (online && session && mode !== 'cliente') return <Redirect href={MODE_HOME[mode]} />;
  return (
    <Tabs
      tabBar={wide ? (props) => <WebNav {...props} /> : undefined}
      screenLayout={({ route, children }) => (
        <ScreenFrame frame={WIDE_SCREENS.has(route.name) ? 'wide' : 'column'}>{children}</ScreenFrame>
      )}
      screenOptions={{
        headerShown: false,
        tabBarPosition: wide ? 'top' : 'bottom',
        sceneStyle: { backgroundColor: Colors.background },
        tabBarActiveTintColor: Colors.orangeDeep,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontFamily: Fonts.headingMedium, fontSize: 11 },
        tabBarStyle: { borderTopColor: Colors.line, backgroundColor: Colors.surface },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="buscar" options={{ title: 'Buscar', tabBarIcon: icon('search-outline', 'search') }} />
      <Tabs.Screen name="pedidos" options={{ title: 'Pedidos', tabBarIcon: icon('receipt-outline', 'receipt') }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icon('person-outline', 'person') }} />
    </Tabs>
  );
}
