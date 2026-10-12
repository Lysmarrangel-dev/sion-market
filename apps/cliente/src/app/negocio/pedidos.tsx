import Ionicons from '@expo/vector-icons/Ionicons';
import { nextStatusesFor, type OrderStatus } from '@sionmarket/contracts';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chips, FormError, formStyles } from '@/components/form';
import { NegocioHeader, NegocioScreen } from '@/components/negocio-gate';
import { formatUsd } from '@/components/price';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { ACTION_LABEL, STATUS_LABEL, panel, type PanelOrder } from '@/lib/panel';
import { useNegocio } from '@/store/negocio';

type View_ = 'curso' | 'historial';
const VIEWS: { id: View_; label: string }[] = [
  { id: 'curso', label: 'En curso' },
  { id: 'historial', label: 'Historial' },
];

// The realtime alert reloads the list at once; this is only the safety net.
const POLL_MS = 30_000;

const GROUPS: { title: string; statuses: OrderStatus[]; empty?: string }[] = [
  { title: 'Nuevos', statuses: ['PENDIENTE'], empty: 'No hay pedidos nuevos. Te avisamos con sonido cuando llegue uno.' },
  { title: 'En cocina', statuses: ['ACEPTADO', 'EN_PREPARACION'] },
  { title: 'Listos para el repartidor', statuses: ['LISTO'] },
];

const minutesAgo = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
const ago = (iso: string) => {
  const m = minutesAgo(iso);
  return m < 1 ? 'recién llegado' : m < 60 ? `hace ${m} min` : new Date(iso).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
};

function Pedidos({ restaurantId }: { restaurantId: string }) {
  const { inbox } = useNegocio();
  const [view, setView] = useState<View_>('curso');
  const [orders, setOrders] = useState<PanelOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, tick] = useState(0);

  const load = useCallback(() => {
    (view === 'curso' ? panel.orders(restaurantId) : panel.history(restaurantId))
      .then((list) => {
        setOrders(list);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [restaurantId, view]);

  useFocusEffect(load);
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      load();
      tick((n) => n + 1);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load, inbox]);

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

  return (
    <>
      <Chips options={VIEWS} value={view} onChange={(v) => (setOrders(null), setView(v))} />
      <FormError message={error} />
      {!orders ? <ActivityIndicator color={Colors.orange} /> : null}
      {orders && view === 'curso'
        ? GROUPS.map((g) => {
            const list = orders.filter((o) => g.statuses.includes(o.status));
            if (!list.length && !g.empty) return null;
            return (
              <View key={g.title} style={{ gap: 10 }}>
                <Text variant="label">
                  {g.title} {list.length ? `· ${list.length}` : ''}
                </Text>
                {list.length ? (
                  list.map((o) => <OrderCard key={o.id} order={o} busy={busy === o.id} onMove={(s) => move(o, s)} />)
                ) : (
                  <View style={styles.empty}>
                    <Ionicons name="notifications-outline" size={26} color={Colors.textMuted} />
                    <Text variant="caption" style={{ textAlign: 'center' }}>
                      {g.empty}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        : null}
      {orders && view === 'historial' ? (
        orders.length ? (
          orders.map((o) => <OrderCard key={o.id} order={o} busy={false} onMove={() => {}} compact />)
        ) : (
          <Text variant="caption" style={{ textAlign: 'center' }}>
            Aquí quedan los pedidos que ya salieron de tu cocina.
          </Text>
        )
      ) : null}
    </>
  );
}

function OrderCard({ order: o, busy, onMove, compact }: { order: PanelOrder; busy: boolean; onMove: (s: OrderStatus) => void; compact?: boolean }) {
  const isNew = o.status === 'PENDIENTE';
  const late = isNew && minutesAgo(o.createdAt) >= 5;
  const actions = compact ? [] : nextStatusesFor(o.status, 'restaurante');
  return (
    <View style={[formStyles.card, isNew && { borderColor: Colors.orange, borderWidth: 2 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text variant="heading">Pedido {o.code}</Text>
          <Text variant="caption" style={late && { color: Colors.danger }}>
            {compact ? new Date(o.createdAt).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ago(o.createdAt)}
            {late ? ' · el cliente está esperando' : ''}
          </Text>
        </View>
        <View style={[styles.badge, isNew && { backgroundColor: Colors.orange }]}>
          <Text variant="caption" style={{ color: isNew ? Colors.black : Colors.text }}>
            {STATUS_LABEL[o.status]}
          </Text>
        </View>
      </View>
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
        <Text variant="caption">Comida (lo que cobras tú)</Text>
        <Text variant="bodyStrong">{formatUsd(o.totals.restaurantTotalCents / 100)}</Text>
      </View>
      {o.status === 'LISTO' && o.pickupPin ? (
        <View style={styles.pin}>
          <Text variant="caption">Código de retiro para el repartidor</Text>
          <Text variant="title">{o.pickupPin}</Text>
        </View>
      ) : null}
      {o.status === 'RECHAZADO' || o.status === 'CANCELADO' ? (
        <Text variant="caption">{o.history.at(-1)?.reason ?? ''}</Text>
      ) : null}
      {actions.length ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {actions.map((s) => (
            <Button
              key={s}
              title={ACTION_LABEL[s] ?? STATUS_LABEL[s]}
              variant={s === 'RECHAZADO' ? 'outline' : 'primary'}
              disabled={busy}
              onPress={() => onMove(s)}
              style={{ flex: 1 }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: Colors.background },
  empty: { alignItems: 'center', gap: 8, padding: 20, backgroundColor: Colors.surface, borderRadius: Radius.md },
  pin: { alignItems: 'center', padding: 10, borderRadius: Radius.sm, backgroundColor: Colors.orangeSoft },
});

export default function PedidosScreen() {
  return (
    <NegocioScreen>
      {(r) => (
        <>
          <NegocioHeader restaurant={r} title="Pedidos" />
          <Pedidos restaurantId={r.id} />
        </>
      )}
    </NegocioScreen>
  );
}
