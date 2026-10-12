import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Logo } from '@/components/logo';
import { formatUsd } from '@/components/price';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius, setTheme, theme } from '@/constants/theme';
import { online } from '@/lib/api';
import { requireLogin } from '@/lib/auth-gate';
import { CONTENT_MAX, useLayout } from '@/lib/layout';
import { useSession } from '@/lib/session';
import { useCart } from '@/store/cart';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  buscar: 'search',
  pedidos: 'receipt',
  perfil: 'person',
};

type Props = BottomTabBarProps & {
  /** Icon per tab route (the outline variant is used when not selected). */
  icons?: Record<string, keyof typeof Ionicons.glyphMap>;
  /** Panels (restaurant, admin) name themselves next to the logo and show no cart. */
  panel?: string;
};

/** Top navigation bar that replaces the bottom tabs on wide screens. */
export function WebNav({ state, descriptors, navigation, icons = ICONS, panel }: Props) {
  const { desktop } = useLayout();
  const session = useSession();
  const { count, subtotalUsd } = useCart();

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <Pressable
          onPress={() => navigation.navigate('index')}
          accessibilityRole="link"
          accessibilityLabel="Inicio"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Logo height={34} />
          {panel ? (
            <View style={styles.panelTag}>
              <Text variant="label" style={{ color: Colors.orangeDeep }}>
                {panel}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.links}>
          {state.routes.map((route, i) => {
            if (!icons[route.name]) return null; // hidden routes (detail screens inside the tabs)
            const focused = state.index === i;
            const label = descriptors[route.key].options.title ?? route.name;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                style={[styles.link, focused && styles.linkOn]}>
                <Ionicons
                  name={focused ? icons[route.name] : (`${icons[route.name]}-outline` as keyof typeof Ionicons.glyphMap)}
                  size={18}
                  color={focused ? Colors.orangeDeep : Colors.text}
                />
                <Text variant="bodyStrong" style={[styles.linkText, focused && { color: Colors.orangeDeep }]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.round}
            onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            accessibilityLabel={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}>
            <Ionicons name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={Colors.text} />
          </Pressable>
          {panel ? null : (
          <Pressable style={styles.cart} onPress={() => router.push('/carrito')} accessibilityLabel={`Carrito, ${count} productos`}>
            <Ionicons name="bag-handle-outline" size={20} color={Colors.text} />
            {desktop && count ? <Text variant="bodyStrong">{formatUsd(subtotalUsd)}</Text> : null}
            {count ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{count}</Text>
              </View>
            ) : null}
          </Pressable>
          )}
          {online && !session ? (
            <Pressable style={styles.enter} onPress={requireLogin} accessibilityRole="button">
              <Text variant="bodyStrong" style={{ color: Colors.black }}>
                Entrar
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.line },
  inner: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    alignSelf: 'center',
    height: 68,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  panelTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: Colors.orangeSoft },
  links: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 40, borderRadius: Radius.pill },
  linkOn: { backgroundColor: Colors.orangeSoft },
  linkText: { fontFamily: Fonts.headingMedium, fontSize: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontFamily: Fonts.heading, color: Colors.black },
  enter: { height: 42, paddingHorizontal: 20, borderRadius: Radius.pill, backgroundColor: Colors.orange, justifyContent: 'center' },
});
