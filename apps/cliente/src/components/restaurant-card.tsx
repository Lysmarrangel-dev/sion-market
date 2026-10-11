import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/text';
import { cellWidth, useLayout } from '@/lib/layout';
import { useState } from 'react';
import { Colors, Radius } from '@/constants/theme';
import type { Restaurant } from '@/data/catalog';

export function RestaurantCard({
  restaurant,
  compact,
  style,
}: {
  restaurant: Restaurant;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  // The width lives on a wrapper: on web, Link's asChild drops a Pressable's style function.
  return (
    <View style={[compact && styles.compact, style]}>
    <Link href={{ pathname: '/restaurante/[id]', params: { id: restaurant.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
        <View>
          <Image source={restaurant.image} style={[styles.image, compact && { height: 120, aspectRatio: undefined }]} contentFit="cover" transition={200} />
          {restaurant.promo ? (
            <View style={styles.promo}>
              <Text style={styles.promoText}>{restaurant.promo}</Text>
            </View>
          ) : null}
          {!restaurant.open ? (
            <View style={styles.closed}>
              <Text style={styles.closedText}>Cerrado ahora</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.body}>
          <View style={styles.row}>
            <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
              {restaurant.name}
            </Text>
            <View style={styles.rating}>
              <Ionicons name="star" size={13} color={Colors.orange} />
              <Text variant="bodyStrong" style={{ fontSize: 13 }}>
                {restaurant.rating.toFixed(1)}
              </Text>
            </View>
          </View>
          <Text variant="caption">
            {'$'.repeat(restaurant.priceLevel)} · {restaurant.tags.join(' · ')} · {restaurant.etaMin}-{restaurant.etaMax} min ·{' '}
            {restaurant.deliveryUsd ? `Delivery $${restaurant.deliveryUsd.toFixed(2)}` : 'Delivery gratis'} · {restaurant.distanceKm} km
          </Text>
        </View>
      </Pressable>
    </Link>
    </View>
  );
}

const GAP = 16;

/** One column on phones; two or three cards per row on wider screens. */
export function RestaurantGrid({ restaurants }: { restaurants: Restaurant[] }) {
  const { columns } = useLayout();
  const [width, setWidth] = useState(0);
  const cell = width ? cellWidth(width, columns, GAP) : undefined;
  return (
    <View
      style={[styles.grid, { gap: columns > 1 ? GAP : 14 }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {restaurants.map((r) => (
        <RestaurantCard key={r.id} restaurant={r} style={columns > 1 && cell ? { width: cell } : { width: '100%' }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.line },
  compact: { width: 250 },
  image: { width: '100%', aspectRatio: 16 / 7.5 },
  body: { padding: 12, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  // Angled tag echoing the brand's 16° motif.
  promo: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: Colors.orange,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    transform: [{ skewX: '-16deg' }],
  },
  promoText: { fontSize: 12, fontWeight: '700', color: Colors.black },
  closed: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  closedText: { color: Colors.white, fontWeight: '700' },
});
