import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AngleStripes } from '@/components/angle-stripes';
import { Logo } from '@/components/logo';
import { Text } from '@/components/text';
import { BrandGradient, Colors, Radius } from '@/constants/theme';
import { COLUMN_MAX, CONTENT_MAX, useLayout } from '@/lib/layout';

/**
 * How a screen sits on a wide (web/tablet) window. On phones every frame renders the screen as is.
 * - wide: the screen lays out its own centred content (home, search, restaurant)
 * - column: a centred reading column (orders and profile, under the top navigation)
 * - page: the same column under a slim brand bar, for screens outside the tabs (cart, checkout…)
 * - auth: brand panel on the left, the form on the right
 * - card: a phone-sized card in the middle (onboarding)
 */
export type Frame = 'wide' | 'column' | 'page' | 'auth' | 'card';

export function ScreenFrame({ frame, children }: { frame: Frame; children: ReactNode }) {
  const { wide, width } = useLayout();
  if (!wide || frame === 'wide') return <>{children}</>;

  if (frame === 'auth' && width >= 980) {
    return (
      <View style={styles.split}>
        <BrandPanel />
        <View style={styles.formSide}>
          <View style={styles.form}>{children}</View>
        </View>
      </View>
    );
  }

  if (frame === 'card') {
    return (
      <View style={[styles.backdrop, { justifyContent: 'center', padding: 32 }]}>
        <View style={styles.card}>{children}</View>
      </View>
    );
  }

  const column = (
    <View style={styles.backdrop}>
      <View style={[styles.column, frame === 'auth' && { maxWidth: 520 }]}>{children}</View>
    </View>
  );
  if (frame !== 'page') return column;
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.topBar}>
        <View style={styles.topInner}>
          <Pressable onPress={() => router.navigate('/(tabs)')} accessibilityRole="link" accessibilityLabel="Ir al inicio">
            <Logo height={30} />
          </Pressable>
        </View>
      </View>
      {column}
    </View>
  );
}

const POINTS = [
  { icon: 'restaurant' as const, text: 'Los restaurantes de San Felipe en un solo lugar' },
  { icon: 'cash' as const, text: 'Paga con Pago Móvil, transferencia, tarjeta o efectivo' },
  { icon: 'bicycle' as const, text: 'Sigue a tu repartidor en el mapa hasta tu puerta' },
];

function BrandPanel() {
  return (
    <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.brand}>
      <AngleStripes />
      <Logo kind="blanco" height={56} />
      <View style={{ gap: 28, maxWidth: 520 }}>
        <Text variant="display" style={styles.brandTitle}>
          Lo que necesitas, a un toque.
        </Text>
        <View style={{ gap: 16 }}>
          {POINTS.map((p) => (
            <View key={p.text} style={styles.point}>
              <View style={styles.pointIcon}>
                <Ionicons name={p.icon} size={22} color={Colors.black} />
              </View>
              <Text style={styles.pointText}>{p.text}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>© Sionmarket · San Felipe, Yaracuy</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  topBar: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.line },
  topInner: { width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', height: 60, paddingHorizontal: 24, justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: Colors.backdrop, alignItems: 'center' },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: COLUMN_MAX,
    backgroundColor: Colors.background,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    height: '100%',
    maxHeight: 820,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
  },
  split: { flex: 1, flexDirection: 'row', backgroundColor: Colors.surface },
  brand: { flex: 1, padding: 56, justifyContent: 'space-between', overflow: 'hidden' },
  brandTitle: { color: Colors.white, fontSize: 48, lineHeight: 54 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pointIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-16deg' }],
  },
  pointText: { color: Colors.white, fontSize: 17, lineHeight: 24, flex: 1 },
  formSide: { width: '42%', minWidth: 460, maxWidth: 620, alignItems: 'center', justifyContent: 'center', padding: 32 },
  form: { width: '100%', maxWidth: 440, height: '100%', maxHeight: 760 },
});
