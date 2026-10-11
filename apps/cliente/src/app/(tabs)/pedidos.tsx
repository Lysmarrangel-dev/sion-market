import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatUsd } from '@/components/price';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { getRestaurant } from '@/data/catalog';
import { isActive, STATUS_INFO } from '@/data/order-states';
import { confirm } from '@/lib/confirm';
import { useCart } from '@/store/cart';
import { useOrders, type Order } from '@/store/orders';

const when = (ms: number) =>
  new Date(ms).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export default function Pedidos() {
  const { orders } = useOrders();
  const cart = useCart();
  const active = orders.filter((o) => isActive(o.status));
  const past = orders.filter((o) => !isActive(o.status));

  // RF-C08: repeat a past order by refilling the cart with the same items.
  const repeat = async (o: Order) => {
    if (!o.lines.length) return router.push({ pathname: '/restaurante/[id]', params: { id: o.restaurantId } });
    if (cart.count && cart.restaurantId !== o.restaurantId) {
      const ok = await confirm('¿Vaciar el carrito?', 'Tu carrito tiene productos de otro restaurante.', 'Vaciar y repetir');
      if (!ok) return;
    }
    o.lines.forEach((l) => cart.add({ product: l.product, quantity: l.quantity, options: l.options, note: l.note }));
    router.push('/carrito');
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text variant="display">Mis pedidos</Text>
        {active.length ? (
          <Text variant="label" style={{ color: Colors.textMuted, marginTop: 8 }}>
            En curso
          </Text>
        ) : null}
        {active.map((o) => (
          <OrderCard key={o.id} order={o} onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: o.id } })} />
        ))}
        <Text variant="label" style={{ color: Colors.textMuted, marginTop: 8 }}>
          Anteriores
        </Text>
        {past.map((o) => (
          <OrderCard key={o.id} order={o} onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: o.id } })}>
            {o.status === 'ENTREGADO' ? (
              <View style={styles.actions}>
                <Pressable style={[styles.action, styles.actionPrimary]} onPress={() => repeat(o)}>
                  <Text variant="bodyStrong">Repetir pedido</Text>
                </Pressable>
                <Pressable style={styles.action} onPress={() => router.push({ pathname: '/reportar/[id]', params: { id: o.id } })}>
                  <Text variant="bodyStrong">{o.report ? 'Reporte enviado' : 'Reportar problema'}</Text>
                </Pressable>
              </View>
            ) : null}
          </OrderCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function OrderCard({ order, onPress, children }: { order: Order; onPress: () => void; children?: React.ReactNode }) {
  const restaurant = getRestaurant(order.restaurantId);
  const done = order.status === 'ENTREGADO';
  const bad = order.status === 'CANCELADO' || order.status === 'RECHAZADO';
  const color = done ? Colors.success : bad ? Colors.crimson : Colors.orangeDeep;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Image source={restaurant?.logo} style={styles.thumb} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading">{restaurant?.name}</Text>
          <Text variant="caption">
            {when(order.createdAt)} · {order.code}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {order.lines.length ? order.lines.map((l) => `${l.product.name}${l.quantity > 1 ? ` x${l.quantity}` : ''}`).join(', ') : order.generalNote}
          </Text>
        </View>
        <Text variant="bodyStrong">{formatUsd(order.totals.totalUsd)}</Text>
      </View>
      <View style={styles.status}>
        <Ionicons name={STATUS_INFO[order.status].icon as keyof typeof Ionicons.glyphMap} size={16} color={color} />
        <Text variant="caption" style={{ color }}>
          {STATUS_INFO[order.status].label}
        </Text>
        {order.rating ? (
          <Text variant="caption" style={{ marginLeft: 'auto' }}>
            Calificaste ★ {order.rating.food} / ★ {order.rating.delivery}
          </Text>
        ) : null}
      </View>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.line },
  thumb: { width: 54, height: 54, borderRadius: 12 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, height: 42, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.line },
  actionPrimary: { backgroundColor: Colors.orange, borderColor: Colors.orange },
});
