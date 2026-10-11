import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AngleStripes } from '@/components/angle-stripes';
import { CartBar } from '@/components/cart-bar';
import { IconButton } from '@/components/icon-button';
import { Logo } from '@/components/logo';
import { RestaurantCard } from '@/components/restaurant-card';
import { Text } from '@/components/text';
import { BrandGradient, Colors, Radius } from '@/constants/theme';
import { CATEGORIES, getRestaurant, RESTAURANTS } from '@/data/catalog';
import { isActive, STATUS_INFO } from '@/data/order-states';
import { useAddresses } from '@/store/addresses';
import { useOrders } from '@/store/orders';

export default function Home() {
  const popular = [...RESTAURANTS].filter((r) => r.open).sort((a, b) => b.rating - a.rating);
  const { selected } = useAddresses();
  const { orders } = useOrders();
  const active = orders.find((o) => isActive(o.status));
  // RF-C03: previous orders on the home screen, one per restaurant.
  const previous = [...new Map(orders.filter((o) => o.status === 'ENTREGADO').map((o) => [o.restaurantId, o])).values()];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Logo kind="isotipo" height={40} />
          <Pressable
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel="Cambiar dirección de entrega"
            onPress={() => router.push({ pathname: '/direcciones', params: { elegir: '1' } })}>
            <Text variant="label" style={{ color: Colors.textMuted }}>
              Entregar en
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text variant="heading" numberOfLines={1}>
                {selected ? `${selected.alias} · ${selected.street}` : 'Agrega una dirección'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.black} />
            </View>
          </Pressable>
          <IconButton name="notifications-outline" badge={active ? 1 : undefined} onPress={() => active && router.push({ pathname: '/pedido/[id]', params: { id: active.id } })} />
        </View>

        <Pressable style={styles.search} onPress={() => router.navigate('/buscar')}>
          <Ionicons name="search" size={20} color={Colors.textMuted} />
          <Text variant="caption" style={{ fontSize: 15 }}>
            ¿Qué se te antoja hoy?
          </Text>
        </Pressable>

        <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
          <AngleStripes count={4} />
          <Text variant="label" style={{ color: Colors.white }}>
            Solo esta semana
          </Text>
          <Text variant="title" style={{ color: Colors.white, maxWidth: 220 }}>
            Tu primer delivery es gratis
          </Text>
          <View style={styles.code}>
            <Text variant="bodyStrong">Código: SIONNUEVO</Text>
          </View>
        </LinearGradient>

        {active ? (
          <Pressable style={styles.active} onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: active.id } })}>
            <Ionicons name={STATUS_INFO[active.status].icon as keyof typeof Ionicons.glyphMap} size={22} color={Colors.black} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Pedido {active.code} · {STATUS_INFO[active.status].label}</Text>
              <Text variant="caption" style={{ color: Colors.black }}>
                Toca para seguirlo en vivo
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.black} />
          </Pressable>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.id}
              style={styles.cat}
              onPress={() => router.navigate({ pathname: '/buscar', params: { categoria: c.id } })}>
              <View style={styles.catIcon}>
                <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={26} color={Colors.orangeDeep} />
              </View>
              <Text variant="caption" style={{ color: Colors.text }}>
                {c.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {previous.length ? (
          <>
            <Text variant="title" style={styles.section}>
              Pedir de nuevo
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
              {previous.map((o) => {
                const r = getRestaurant(o.restaurantId);
                if (!r) return null;
                return (
                  <Pressable
                    key={o.id}
                    style={styles.again}
                    onPress={() => router.push({ pathname: '/restaurante/[id]', params: { id: r.id } })}>
                    <Image source={r.logo} style={styles.againImg} />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text variant="caption" numberOfLines={1}>
                        {o.lines.length ? o.lines.map((l) => l.product.name).join(', ') : o.generalNote}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        <Text variant="title" style={styles.section}>
          Populares cerca de ti
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
          {popular.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} compact />
          ))}
        </ScrollView>

        <Text variant="title" style={styles.section}>
          Todos los restaurantes
        </Text>
        <View style={{ gap: 14, paddingHorizontal: 16 }}>
          {RESTAURANTS.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} />
          ))}
        </View>
      </ScrollView>

      <Pressable style={styles.ai} onPress={() => router.push('/asistente')}>
        <Ionicons name="sparkles" size={22} color={Colors.white} />
      </Pressable>
      <CartBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  search: {
    marginHorizontal: 16,
    height: 50,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  banner: { margin: 16, borderRadius: Radius.lg, padding: 20, gap: 6, overflow: 'hidden', minHeight: 150 },
  code: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    transform: [{ skewX: '-16deg' }],
  },
  cats: { gap: 14, paddingHorizontal: 16 },
  active: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.orange,
  },
  again: {
    width: 240,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  againImg: { width: 48, height: 48, borderRadius: 12 },
  cat: { alignItems: 'center', gap: 6, width: 76 },
  catIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: Colors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 26, marginBottom: 12, paddingHorizontal: 16 },
  ai: {
    position: 'absolute',
    right: 16,
    bottom: 90,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});
