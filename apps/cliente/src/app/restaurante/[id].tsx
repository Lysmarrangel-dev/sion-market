import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CartBar } from '@/components/cart-bar';
import { IconButton } from '@/components/icon-button';
import { Price } from '@/components/price';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { getRestaurant, productsOf } from '@/data/catalog';
import { goBack } from '@/lib/nav';
import { useLayout } from '@/lib/layout';

export default function RestauranteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { wide } = useLayout();
  const restaurant = getRestaurant(id);
  if (!restaurant) return null;

  const products = productsOf(restaurant.id);
  const sections = [...new Set(products.map((p) => p.section))];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Image source={restaurant.image} style={[styles.hero, wide && { height: 340 }]} contentFit="cover" />
        <View style={wide ? styles.pageWide : undefined}>
        <View style={[styles.info, wide && { padding: 28, marginTop: -60 }]}>
          <Text variant="display">{restaurant.name}</Text>
          <Text variant="caption">{restaurant.tags.join(' · ')}</Text>
          <View style={styles.stats}>
            <Stat icon="star" label={`${restaurant.rating} (${restaurant.reviews})`} />
            <Stat icon="time-outline" label={`${restaurant.etaMin}-${restaurant.etaMax} min`} />
            <Stat icon="bicycle-outline" label={restaurant.deliveryUsd ? `$${restaurant.deliveryUsd.toFixed(2)}` : 'Gratis'} />
            <Stat icon="cart-outline" label={`Mín. $${restaurant.minimumUsd.toFixed(2)}`} />
          </View>
          <Info icon="time-outline" text={restaurant.schedule} />
          <Info icon="location-outline" text={`${restaurant.address} · ${restaurant.distanceKm} km`} />
          {restaurant.promo ? (
            <View style={styles.promo}>
              <Ionicons name="pricetag" size={16} color={Colors.crimson} />
              <Text variant="bodyStrong" style={{ color: Colors.crimson }}>
                {restaurant.promo}
              </Text>
            </View>
          ) : null}
          {!restaurant.open ? (
            <View style={[styles.promo, { backgroundColor: Colors.line }]}>
              <Ionicons name="moon" size={16} color={Colors.text} />
              <Text variant="bodyStrong">Cerrado ahora. Abre mañana a las 11:00 a. m.</Text>
            </View>
          ) : null}
        </View>

        {sections.map((section) => (
          <View key={section} style={{ paddingHorizontal: 16, marginTop: 20 }}>
            <Text variant="title" style={{ marginBottom: 10 }}>
              {section}
            </Text>
            <View style={wide ? styles.productsWide : { gap: 10 }}>
              {products
                .filter((p) => p.section === section)
                .map((p) => (
                  <Pressable
                    key={p.id}
                    disabled={!restaurant.open || p.soldOut}
                    accessibilityLabel={`${p.name}${p.soldOut ? ', agotado' : ''}`}
                    onPress={() => router.push({ pathname: '/producto/[id]', params: { id: p.id } })}
                    style={({ pressed }) => [styles.product, wide && { width: '49.2%' }, pressed && { opacity: 0.85 }, p.soldOut && { opacity: 0.5 }]}>
                      <View style={{ flex: 1, gap: 4 }}>
                        {p.soldOut ? (
                          <Text variant="label" style={{ color: Colors.crimson, fontSize: 11 }}>
                            Agotado hoy
                          </Text>
                        ) : p.popular ? (
                          <Text variant="label" style={{ color: Colors.orangeDeep, fontSize: 11 }}>
                            Más pedido
                          </Text>
                        ) : null}
                        <Text variant="heading">{p.name}</Text>
                        <Text variant="caption" numberOfLines={2}>
                          {p.description}
                        </Text>
                        <Price usd={p.priceUsd} size="sm" style={{ marginTop: 4 }} />
                      </View>
                      <View>
                        <Image source={p.image} style={styles.productImg} contentFit="cover" />
                        {!p.soldOut ? (
                          <View style={styles.add}>
                            <Ionicons name="add" size={20} color={Colors.black} />
                          </View>
                        ) : null}
                      </View>
                  </Pressable>
                ))}
            </View>
          </View>
        ))}
        </View>
      </ScrollView>

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <IconButton name="arrow-back" light onPress={goBack} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <IconButton name="heart-outline" light />
          <IconButton name="share-outline" light />
        </View>
      </View>
      <CartBar bottom={insets.bottom + 16} />
    </View>
  );
}

function Info({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 6 }}>
      <Ionicons name={icon} size={16} color={Colors.textMuted} style={{ marginTop: 2 }} />
      <Text variant="caption" style={{ flex: 1, fontSize: 14 }}>
        {text}
      </Text>
    </View>
  );
}

function Stat({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={15} color={Colors.orangeDeep} />
      <Text variant="bodyStrong" style={{ fontSize: 13 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageWide: { width: '100%', maxWidth: 1100, alignSelf: 'center', paddingHorizontal: 8 },
  productsWide: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  hero: { width: '100%', height: 260 },
  info: {
    marginTop: -28,
    marginHorizontal: 16,
    padding: 18,
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  stats: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
  },
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    borderRadius: Radius.sm,
    backgroundColor: '#FDECEE',
  },
  product: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  productImg: { width: 104, height: 104, borderRadius: 14 },
  add: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
});
