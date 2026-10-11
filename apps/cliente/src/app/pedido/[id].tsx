import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { TrackingMap } from '@/components/maps';
import { formatUsd } from '@/components/price';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { getRestaurant, RIDER } from '@/data/catalog';
import { canConsumerCancel, MAIN_FLOW, STATUS_INFO } from '@/data/order-states';
import { confirm } from '@/lib/confirm';
import { lerp } from '@/lib/geo';
import { riderProgress, useOrders } from '@/store/orders';
import { goBack } from '@/lib/nav';

const time = (ms: number) => new Date(ms).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' });

// RF-C06: tracking with timeline, dynamic ETA and live rider map from ENTREGADO_AL_DELIVERY.
export default function PedidoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { get, cancel } = useOrders();
  const order = get(id);
  const [, tick] = useState(0);

  // Re-render every second so the rider marker and ETA move.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (!order) return null;
  const restaurant = getRestaurant(order.restaurantId)!;
  const stepIndex = MAIN_FLOW.indexOf(order.status);
  const ended = order.status === 'CANCELADO' || order.status === 'RECHAZADO';
  const delivered = order.status === 'ENTREGADO';
  const riderAssigned = stepIndex >= MAIN_FLOW.indexOf('LISTO');
  const showMap = stepIndex >= MAIN_FLOW.indexOf('ENTREGADO_AL_DELIVERY');
  const progress = riderProgress(order);
  const rider = showMap ? lerp(restaurant.location, order.address.location, progress) : null;

  const remainingSteps = MAIN_FLOW.length - 1 - Math.max(stepIndex, 0);
  const etaMin = Math.max(2, Math.round(remainingSteps * 4 * (1 - progress * 0.5)));
  const at = (s: string) => order.history.find((h) => h.status === s)?.at;

  const askCancel = async () => {
    const ok = await confirm('¿Cancelar el pedido?', 'Puedes cancelar sin costo hasta que el restaurante lo acepte.', 'Cancelar pedido');
    if (ok) cancel(order.id, 'Cancelado por ti').catch(() => {});
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      <View style={styles.top}>
        {showMap ? (
          <TrackingMap restaurant={restaurant.location} customer={order.address.location} rider={rider} />
        ) : (
          <View style={styles.placeholder}>
            <Image source={restaurant.image} style={StyleSheet.absoluteFill} contentFit="cover" />
            <View style={styles.dim} />
            <Ionicons name={STATUS_INFO[order.status].icon as keyof typeof Ionicons.glyphMap} size={46} color={Colors.white} />
            <Text variant="heading" style={{ color: Colors.white }}>
              {restaurant.name}
            </Text>
          </View>
        )}
        <Pressable style={styles.close} onPress={goBack} accessibilityLabel="Cerrar">
          <Ionicons name="close" size={22} color={Colors.black} />
        </Pressable>
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}>
        <View>
          <Text variant="label" style={{ color: Colors.textMuted }}>
            Pedido {order.code} · {restaurant.name}
          </Text>
          <Text variant="display" accessibilityLiveRegion="polite">
            {ended ? STATUS_INFO[order.status].label : delivered ? '¡Buen provecho!' : `Llega en ~${etaMin} min`}
          </Text>
          {!ended && !delivered ? <Text variant="caption">{STATUS_INFO[order.status].label}</Text> : null}
        </View>

        {ended ? (
          <View style={styles.ended}>
            <Text variant="bodyStrong">{order.cancelReason ?? 'El restaurante no pudo tomar tu pedido.'}</Text>
            <Text variant="caption">
              {order.payment === 'Efectivo'
                ? 'No se realizó ningún cobro.'
                : `Reembolso de ${formatUsd(order.totals.totalUsd)} en proceso por ${order.payment}.`}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.progress}>
              {MAIN_FLOW.slice(1).map((s, i) => (
                <View key={s} style={[styles.bar, i + 1 <= stepIndex && styles.barOn]} />
              ))}
            </View>
            <View style={{ gap: 10 }}>
              {MAIN_FLOW.map((s, i) => {
                const done = i <= stepIndex;
                const when = at(s);
                return (
                  <View key={s} style={styles.stepRow}>
                    <View style={[styles.stepIcon, done && styles.stepIconOn]}>
                      <Ionicons name={STATUS_INFO[s].icon as keyof typeof Ionicons.glyphMap} size={15} color={done ? Colors.black : Colors.textMuted} />
                    </View>
                    <Text variant={i === stepIndex ? 'bodyStrong' : 'body'} style={{ color: done ? Colors.text : Colors.textMuted, flex: 1 }}>
                      {STATUS_INFO[s].label}
                    </Text>
                    {when ? <Text variant="caption">{time(when)}</Text> : null}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {riderAssigned && !ended ? (
          <View style={styles.riderCard}>
            <Image source={RIDER.photo} style={styles.avatar} accessibilityLabel={`Foto de ${RIDER.name}`} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{RIDER.name}</Text>
              <Text variant="caption">
                {RIDER.vehicle} · ★ {RIDER.rating}
              </Text>
            </View>
            <Pressable
              style={styles.round}
              accessibilityLabel="Chatear con el repartidor"
              onPress={() => router.push({ pathname: '/chat', params: { pedido: order.id } })}>
              <Ionicons name="chatbubble-ellipses" size={20} color={Colors.black} />
            </Pressable>
            <Pressable
              style={styles.round}
              accessibilityLabel="Llamar al repartidor (número enmascarado)"
              onPress={() => Linking.openURL(`tel:${RIDER.maskedPhone}`)}>
              <Ionicons name="call" size={20} color={Colors.black} />
            </Pressable>
          </View>
        ) : null}

        {canConsumerCancel(order.status) ? <Button title="Cancelar pedido" variant="outline" onPress={askCancel} /> : null}

        {delivered ? (
          <View style={{ gap: 10 }}>
            {!order.rating ? (
              <Button title="Calificar pedido" onPress={() => router.push({ pathname: '/calificar/[id]', params: { id: order.id } })} />
            ) : (
              <Text variant="bodyStrong" style={{ textAlign: 'center' }}>
                ¡Gracias por calificar!
              </Text>
            )}
            <Button title="Ver factura del delivery" variant="outline" onPress={() => router.push({ pathname: '/factura/[id]', params: { id: order.id } })} />
            <Button title="Reportar un problema" variant="ghost" onPress={() => router.push({ pathname: '/reportar/[id]', params: { id: order.id } })} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  top: { height: 280 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  close: {
    position: 'absolute',
    top: 12,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: { flex: 1, marginTop: -20, backgroundColor: Colors.surface, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  ended: { padding: 14, borderRadius: Radius.md, backgroundColor: '#FDECEE', gap: 4 },
  progress: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.line },
  barOn: { backgroundColor: Colors.orange },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  stepIconOn: { backgroundColor: Colors.orange },
  riderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.background },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  round: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center' },
});
