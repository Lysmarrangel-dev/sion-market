import Ionicons from '@expo/vector-icons/Ionicons';
import { nextStatusesFor, type OrderStatus, type RestaurantDetail } from '@sionmarket/contracts';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chips, FormError, formStyles } from '@/components/form';
import { formatUsd } from '@/components/price';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { useRequireLogin } from '@/lib/auth-gate';
import { ACTION_LABEL, STATUS_LABEL, panel, type PanelOrder } from '@/lib/panel';

type Tab = 'pedidos' | 'menu';

const TABS: { id: Tab; label: string }[] = [
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'menu', label: 'Menú' },
];

const POLL_MS = 15_000;

function Local() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [tab, setTab] = useState<Tab>('pedidos');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    panel
      .detail(id)
      .then(setRestaurant)
      .catch((e) => setError(e.message));
  }, [id]);
  useFocusEffect(reload);

  if (!restaurant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <ScreenHeader title="Restaurante" />
        {error ? <FormError message={error} /> : <ActivityIndicator color={Colors.orange} style={{ marginTop: 40 }} />}
      </SafeAreaView>
    );
  }

  const toggleOpen = async (open: boolean) => {
    setRestaurant({ ...restaurant, open });
    try {
      await panel.setOpen(id, open);
    } catch (e) {
      setRestaurant({ ...restaurant, open: !open });
      setError((e as Error).message);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader
        title={restaurant.name}
        right={
          <Pressable style={styles.edit} onPress={() => router.push({ pathname: '/panel/editar', params: { id } })}>
            <Ionicons name="create-outline" size={18} color={Colors.ink} />
            <Text variant="bodyStrong" style={{ fontSize: 14 }}>
              Editar
            </Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View style={[styles.openBar, { backgroundColor: restaurant.open ? Colors.successSoft : Colors.dangerSoft }]}>
          <View style={{ flex: 1 }}>
            <Text variant="heading" style={{ color: restaurant.open ? Colors.success : Colors.danger }}>
              {restaurant.open ? 'Abierto: recibiendo pedidos' : 'Cerrado: no recibe pedidos'}
            </Text>
            <Text variant="caption">{restaurant.schedule}</Text>
          </View>
          <Switch value={restaurant.open} onValueChange={toggleOpen} trackColor={{ true: Colors.success, false: Colors.line }} thumbColor={Colors.white} />
        </View>
        <FormError message={error} />
        <Chips options={TABS} value={tab} onChange={setTab} />
        {tab === 'pedidos' ? <Orders restaurantId={id} /> : <Menu restaurant={restaurant} onChange={reload} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function Orders({ restaurantId }: { restaurantId: string }) {
  const [orders, setOrders] = useState<PanelOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    panel
      .orders(restaurantId)
      .then((list) => {
        setOrders(list);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [restaurantId]);

  // New orders show up without reloading the page.
  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const move = async (order: PanelOrder, status: OrderStatus) => {
    let reason: string | undefined;
    if (status === 'RECHAZADO') {
      const text = Platform.OS === 'web' ? window.prompt('¿Por qué rechazas el pedido?', 'Sin disponibilidad') : 'Sin disponibilidad';
      if (text === null) return;
      reason = text.trim() || undefined;
    }
    setBusy(order.id);
    try {
      await panel.move(order.id, status, reason);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (!orders) return error ? <FormError message={error} /> : <ActivityIndicator color={Colors.orange} />;

  return (
    <View style={{ gap: 12 }}>
      <FormError message={error} />
      {orders.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={28} color={Colors.textMuted} />
          <Text variant="caption" style={{ textAlign: 'center' }}>
            No hay pedidos activos. Los nuevos aparecen aquí solos.
          </Text>
        </View>
      ) : null}
      {orders.map((o) => (
        <View key={o.id} style={formStyles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="heading" style={{ flex: 1 }}>
              Pedido {o.code}
            </Text>
            <View style={[styles.badge, o.status === 'PENDIENTE' && { backgroundColor: Colors.orange }]}>
              <Text variant="caption" style={{ color: o.status === 'PENDIENTE' ? Colors.black : Colors.text }}>
                {STATUS_LABEL[o.status]}
              </Text>
            </View>
          </View>
          <Text variant="caption">
            {new Date(o.createdAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })} · {o.address.street}
          </Text>
          {o.lines.map((l, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
              <Text variant="bodyStrong">{l.quantity}×</Text>
              <View style={{ flex: 1 }}>
                <Text>{l.name}</Text>
                {l.options.length ? <Text variant="caption">{l.options.map((op) => op.name).join(', ')}</Text> : null}
                {l.note ? <Text variant="caption">Nota: {l.note}</Text> : null}
              </View>
            </View>
          ))}
          {o.generalNote ? <Text variant="caption">Nota del cliente: {o.generalNote}</Text> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption">Comida (lo que cobra el restaurante)</Text>
            <Text variant="bodyStrong">{formatUsd(o.totals.restaurantTotalCents / 100)}</Text>
          </View>
          {o.status === 'LISTO' && o.pickupPin ? (
            <Text variant="bodyStrong">Código de retiro para el repartidor: {o.pickupPin}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {nextStatusesFor(o.status, 'restaurante').map((s) => (
              <Button
                key={s}
                title={ACTION_LABEL[s] ?? STATUS_LABEL[s]}
                variant={s === 'RECHAZADO' ? 'outline' : 'primary'}
                disabled={busy === o.id}
                onPress={() => move(o, s)}
                style={{ flex: 1 }}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function Menu({ restaurant, onChange }: { restaurant: RestaurantDetail; onChange: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const toggleSoldOut = async (productId: string, soldOut: boolean) => {
    try {
      await panel.updateProduct(restaurant.id, productId, { soldOut });
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Button title="Agregar un plato" onPress={() => router.push({ pathname: '/panel/plato', params: { restaurante: restaurant.id } })} />
      <FormError message={error} />
      {restaurant.sections.length === 0 ? (
        <Text variant="caption" style={{ textAlign: 'center' }}>
          El menú está vacío. Agrega tus platos para que los clientes puedan pedir.
        </Text>
      ) : null}
      {restaurant.sections.map((section) => (
        <View key={section.name} style={formStyles.card}>
          <Text variant="label">{section.name}</Text>
          {section.products.map((p) => (
            <View key={p.id} style={styles.product}>
              <Pressable
                style={{ flex: 1, gap: 2 }}
                onPress={() => router.push({ pathname: '/panel/plato', params: { restaurante: restaurant.id, id: p.id } })}>
                <Text variant="bodyStrong" style={p.soldOut && { color: Colors.textMuted, textDecorationLine: 'line-through' }}>
                  {p.name}
                </Text>
                <Text variant="caption">
                  {formatUsd(p.priceCents / 100)}
                  {p.popular ? ' · Popular' : ''}
                  {p.modifierGroups.length ? ` · ${p.modifierGroups.length} opciones` : ''}
                </Text>
              </Pressable>
              <View style={{ alignItems: 'center' }}>
                <Switch
                  value={!p.soldOut}
                  onValueChange={(available) => toggleSoldOut(p.id, !available)}
                  trackColor={{ true: Colors.success, false: Colors.line }}
                  thumbColor={Colors.white}
                />
                <Text variant="caption" style={{ fontSize: 11 }}>
                  {p.soldOut ? 'Agotado' : 'Disponible'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  edit: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 40, borderRadius: 20, borderWidth: 1, borderColor: Colors.line },
  openBar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.md },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: Colors.background },
  empty: { alignItems: 'center', gap: 8, padding: 24, backgroundColor: Colors.surface, borderRadius: Radius.md },
  product: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.line },
});

export default function LocalScreen() {
  return useRequireLogin() ? <Local /> : null;
}
