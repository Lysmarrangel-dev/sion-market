import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Logo } from '@/components/logo';
import { formatUsd } from '@/components/price';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { online } from '@/lib/api';
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

/** Top navigation bar that replaces the bottom tabs on wide screens. */
export function WebNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const { desktop } = useLayout();
  const session = useSession();
  const { count, subtotalUsd } = useCart();

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <Pressable onPress={() => navigation.navigate('index')} accessibilityRole="link" accessibilityLabel="Inicio">
          <Logo height={34} />
        </Pressable>

        <View style={styles.links}>
          {state.routes.map((route, i) => {
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
                  name={focused ? ICONS[route.name] : (`${ICONS[route.name]}-outline` as keyof typeof Ionicons.glyphMap)}
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
          <Pressable style={styles.cart} onPress={() => router.push('/carrito')} accessibilityLabel={`Carrito, ${count} productos`}>
            <Ionicons name="bag-handle-outline" size={20} color={Colors.text} />
            {desktop && count ? <Text variant="bodyStrong">{formatUsd(subtotalUsd)}</Text> : null}
            {count ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{count}</Text>
              </View>
            ) : null}
          </Pressable>
          {online && !session ? (
            <Pressable style={styles.enter} onPress={() => router.push('/login')} accessibilityRole="button">
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
  links: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 40, borderRadius: Radius.pill },
  linkOn: { backgroundColor: Colors.orangeSoft },
  linkText: { fontFamily: Fonts.headingMedium, fontSize: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
