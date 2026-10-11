import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import type { Restaurant } from '@/data/catalog';

export function RestaurantCard({ restaurant, compact }: { restaurant: Restaurant; compact?: boolean }) {
  return (
    <Link href={{ pathname: '/restaurante/[id]', params: { id: restaurant.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.card, compact && styles.compact, pressed && { opacity: 0.9 }]}>
        <View>
          <Image source={restaurant.image} style={[styles.image, compact && { height: 120 }]} contentFit="cover" transition={200} />
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
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.line },
  compact: { width: 250 },
  image: { width: '100%', height: 150 },
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
