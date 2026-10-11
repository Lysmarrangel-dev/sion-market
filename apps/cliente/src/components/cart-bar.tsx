import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatUsd } from '@/components/price';
import { Text } from '@/components/text';
import { useLayout } from '@/lib/layout';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { useCart } from '@/store/cart';

// Floating "ver carrito" bar shown while the cart has items.
export function CartBar({ bottom = 16 }: { bottom?: number }) {
  const { count, subtotalUsd } = useCart();
  const { wide } = useLayout();
  if (!count) return null;
  return (
    <Pressable
      onPress={() => router.push('/carrito')}
      style={({ pressed }) => [styles.bar, { bottom }, wide && styles.barWide, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={styles.count}>
        <Text style={styles.countText}>{count}</Text>
      </View>
      <Text style={styles.label}>Ver carrito</Text>
      <Text style={styles.total}>{formatUsd(subtotalUsd)}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.black} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 58,
    borderRadius: Radius.pill,
    backgroundColor: Colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 10,
    shadowColor: Colors.crimson,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  // On wide screens it floats in the bottom-right corner instead of spanning the window.
  barWide: { left: undefined, right: 24, width: 380 },
  count: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.black, alignItems: 'center', justifyContent: 'center' },
  countText: { color: Colors.white, fontFamily: Fonts.heading },
  label: { flex: 1, fontFamily: Fonts.heading, fontSize: 16, color: Colors.black },
  total: { fontFamily: Fonts.heading, fontSize: 16, color: Colors.black },
});
