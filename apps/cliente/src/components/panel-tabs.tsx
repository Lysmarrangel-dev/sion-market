import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { ScreenFrame } from '@/components/screen-frame';
import { WebNav } from '@/components/web-nav';
import { Colors, Fonts } from '@/constants/theme';
import { useLayout } from '@/lib/layout';

type IconName = keyof typeof Ionicons.glyphMap;
export type PanelTab = { name: string; title: string; icon: IconName; wide?: boolean };

/** Tab bar for the restaurant and admin panels: bottom tabs on a phone, top bar on a wide screen. */
export function PanelTabs({ tabs, hidden = [], panel }: { tabs: PanelTab[]; hidden?: string[]; panel: string }) {
  const { wide } = useLayout();
  const icons = Object.fromEntries(tabs.map((t) => [t.name, t.icon]));
  const wideScreens = new Set(tabs.filter((t) => t.wide).map((t) => t.name));
  return (
    <Tabs
      tabBar={wide ? (props) => <WebNav {...props} icons={icons} panel={panel} /> : undefined}
      screenLayout={({ route, children }) => <ScreenFrame frame={wideScreens.has(route.name) ? 'wide' : 'column'}>{children}</ScreenFrame>}
      screenOptions={{
        headerShown: false,
        tabBarPosition: wide ? 'top' : 'bottom',
        sceneStyle: { backgroundColor: Colors.background },
        tabBarActiveTintColor: Colors.orangeDeep,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontFamily: Fonts.headingMedium, fontSize: 11 },
        tabBarStyle: { borderTopColor: Colors.line, backgroundColor: Colors.surface },
      }}>
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
              <Ionicons name={focused ? t.icon : (`${t.icon}-outline` as IconName)} size={24} color={color} />
            ),
          }}
        />
      ))}
      {hidden.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
