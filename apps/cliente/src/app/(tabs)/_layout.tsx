import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(name: IconName, active: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? active : name} size={24} color={color} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
