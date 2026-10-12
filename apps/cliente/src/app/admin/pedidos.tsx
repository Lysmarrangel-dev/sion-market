import Ionicons from '@expo/vector-icons/Ionicons';
import { nextStatusesFor, type AdminOrder, type AdminOrderQuery } from '@sionmarket/contracts';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Chips, FormError } from '@/components/form';
import { PanelScreen } from '@/components/panel-screen';
import { formatUsd } from '@/components/price';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { useLayout } from '@/lib/layout';
import { STATUS_LABEL, admin, panel } from '@/lib/panel';

type Estado = AdminOrderQuery['estado'];
const VIEWS: { id: Estado; label: string }[] = [
  { id: 'activos', label: 'En curso' },
  { id: 'terminados', label: 'Terminados' },
  { id: 'todos', label: 'Todos' },
];

const PAYMENT: Record<string, string> = { pago_movil: 'Pago Móvil', transferencia: 'Transferencia', tarjeta: 'Tarjeta', efectivo: 'Efectivo' };

const minutes = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
const since = (iso: string) => {
  const m = minutes(iso);
  return m < 60 ? `hace ${m} min` : new Date(iso).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function AdminPedidos() {
  const { wide } = useLayout();
  const params = useLocalSearchParams<{ restaurante?: string; nombre?: string }>();
  // Opened from a restaurant's page: only that restaurant's orders until the filter is removed.
  const restaurant = params.restaurante ? { id: params.restaurante, name: params.nombre ?? '' } : null;
  const [view, setView] = useState<Estado>('activos');
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    admin
      .orders(view, restaurant?.id)
      .then((list) => {
        setOrders(list);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [view, restaurant?.id]);
  useFocusEffect(load);
  useEffect(() => {
    const timer = setInterval(load, 20_000);
    return () => clearInterval(timer);
  }, [load]);

  const cancel = async (o: AdminOrder) => {
    if (!(await confirm('Cancelar pedido', `¿Cancelar el pedido ${o.code} de ${o.restaurant.name}? Se le avisa al cliente.`, 'Cancelar pedido'))) return;
    const reason = Platform.OS === 'web' ? window.prompt('Motivo (lo ve el cliente)', 'Cancelado por SionMarket') : 'Cancelado por SionMarket';
    if (reason === null) return;
    setBusy(o.id);
    try {
      await panel.move(o.id, 'CANCELADO', reason.trim() || undefined);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <PanelScreen title="Pedidos" subtitle={orders ? `${orders.length} ${view === 'activos' ? 'en curso' : 'mostrados'}` : 'SionMarket'} wide>
      <Chips options={VIEWS} value={view} onChange={(v) => (setOrders(null), setView(v))} />
      {restaurant ? (
        <Pressable style={styles.filter} onPress={() => router.setParams({ restaurante: undefined, nombre: undefined })}>
          <Text variant="bodyStrong" style={{ fontSize: 14 }}>
            Solo {restaurant.name || restaurant.id}
          </Text>
          <Ionicons name="close" size={16} color={Colors.text} />
        </Pressable>
      ) : null}
      <FormError message={error} />
      {!orders ? <ActivityIndicator color={Colors.orange} /> : null}
      {orders && !orders.length ? <Text variant="caption">No hay pedidos aquí.</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {orders?.map((o) => {
          const stuck = o.status === 'PENDIENTE' && minutes(o.createdAt) >= 5;
          return (
            <View key={o.id} style={[styles.card, { flexBasis: wide ? '48%' : '100%', flexGrow: 1 }, stuck && { borderColor: Colors.danger }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text variant="heading" style={{ flex: 1 }}>
                  {o.code}
                </Text>
                <View style={[styles.badge, o.status === 'PENDIENTE' && { backgroundColor: Colors.orange }]}>
                  <Text variant="caption" style={{ color: o.status === 'PENDIENTE' ? Colors.black : Colors.text, fontSize: 12 }}>
                    {STATUS_LABEL[o.status]}
                  </Text>
                </View>
              </View>
              <Text variant="bodyStrong">{o.restaurant.name}</Text>
              <Text variant="caption">
                {o.customer ?? 'Cliente'} · {o.zone ?? 'sin zona'} · {PAYMENT[o.paymentMethod] ?? o.paymentMethod}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" style={stuck && { color: Colors.danger }}>
                  {since(o.createdAt)}
                  {stuck ? ' · el restaurante no ha respondido' : ''}
                </Text>
                <Text variant="bodyStrong">{formatUsd(o.totalCents / 100)}</Text>
              </View>
              {nextStatusesFor(o.status, 'admin').includes('CANCELADO') ? (
                <Pressable style={styles.cancel} disabled={busy === o.id} onPress={() => cancel(o)} accessibilityRole="button">
                  <Ionicons name="close-circle-outline" size={16} color={Colors.danger} />
                  <Text variant="bodyStrong" style={{ fontSize: 14, color: Colors.danger }}>
                    Cancelar pedido
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
    </PanelScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6, padding: 14, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.pill, backgroundColor: Colors.background },
  cancel: { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 32, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.line },
  filter: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: Colors.orangeSoft,
  },
});
