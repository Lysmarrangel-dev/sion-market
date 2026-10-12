import Ionicons from '@expo/vector-icons/Ionicons';
import type { RestaurantStats, StatsPeriod } from '@sionmarket/contracts';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Chips, FormError } from '@/components/form';
import { NegocioHeader, NegocioScreen } from '@/components/negocio-gate';
import { formatUsd } from '@/components/price';
import { BarChart, RankList, StatCard, StatGrid, statStyles } from '@/components/stats';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { useLayout } from '@/lib/layout';
import { PERIODS, PREVIOUS_LABEL, panel } from '@/lib/panel';
import { useNegocio } from '@/store/negocio';

const usd = (cents: number) => formatUsd(cents / 100);

function Resumen({ restaurantId }: { restaurantId: string }) {
  const { wide } = useLayout();
  const { inbox } = useNegocio();
  const [period, setPeriod] = useState<StatsPeriod>('dia');
  const [stats, setStats] = useState<RestaurantStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    panel
      .stats(restaurantId, period)
      .then((s) => {
        setStats(s);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, [restaurantId, period]);

  useFocusEffect(load);
  useEffect(load, [load, inbox]);

  if (!stats) return error ? <FormError message={error} /> : <ActivityIndicator color={Colors.orange} />;
  const { totals, previous } = stats;
  const vs = `vs ${PREVIOUS_LABEL[period]}`;

  return (
    <>
      {stats.pending > 0 ? (
        <Pressable style={styles.pending} onPress={() => router.navigate('/negocio/pedidos')}>
          <Ionicons name="notifications" size={22} color={Colors.black} />
          <Text variant="heading" style={{ flex: 1, color: Colors.black }}>
            {stats.pending === 1 ? '1 pedido nuevo espera tu respuesta' : `${stats.pending} pedidos nuevos esperan tu respuesta`}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.black} />
        </Pressable>
      ) : null}
      <Chips options={PERIODS} value={period} onChange={(p) => (setStats(null), setPeriod(p))} />
      <FormError message={error} />
      <StatGrid wide={wide}>
        <StatCard label="Ventas" value={usd(totals.salesCents)} current={totals.salesCents} previous={previous.salesCents} hint={vs} />
        <StatCard label="Pedidos" value={String(totals.orders)} current={totals.orders} previous={previous.orders} hint={vs} />
        <StatCard label="Ticket promedio" value={usd(totals.avgTicketCents)} current={totals.avgTicketCents} previous={previous.avgTicketCents} />
        <StatCard
          label="Rechazados o cancelados"
          value={String(totals.rejected + totals.cancelled)}
          hint={totals.orders ? `${Math.round(((totals.rejected + totals.cancelled) / totals.orders) * 100)}% de los pedidos` : undefined}
        />
      </StatGrid>
      <BarChart
        title={period === 'dia' ? 'Ventas por hora' : 'Ventas por día'}
        points={stats.series}
        format={(p) => `${usd(p.salesCents)} · ${p.orders} ${p.orders === 1 ? 'pedido' : 'pedidos'}`}
      />
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }}>
        <View style={[statStyles.card, { flex: 1 }]}>
          <Text variant="heading">Platos más pedidos</Text>
          <RankList
            rows={stats.topProducts.map((p) => ({ key: p.name, label: p.name, detail: `${p.quantity} · ${usd(p.salesCents)}`, value: p.quantity }))}
            empty="Aquí verás tus platos estrella cuando lleguen pedidos."
          />
        </View>
        <View style={[statStyles.card, { flex: 1 }]}>
          <Text variant="heading">Cómo vas atendiendo</Text>
          <Metric icon="timer-outline" label="Tiempo para aceptar (mediana)" value={stats.acceptMinutes === null ? 'Sin datos' : `${stats.acceptMinutes} min`} />
          <Metric icon="checkmark-done-outline" label="Entregados" value={String(totals.delivered)} />
          <Metric icon="close-circle-outline" label="Rechazados" value={String(totals.rejected)} />
          <Metric icon="ban-outline" label="Cancelados" value={String(totals.cancelled)} />
        </View>
      </View>
    </>
  );
}

function Metric({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={20} color={Colors.orangeDeep} />
      <Text style={{ flex: 1 }}>{label}</Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pending: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: Radius.md, backgroundColor: Colors.orange },
});

export default function ResumenScreen() {
  return (
    <NegocioScreen wide>
      {(r) => (
        <>
          <NegocioHeader restaurant={r} title="Resumen" />
          <Resumen restaurantId={r.id} />
        </>
      )}
    </NegocioScreen>
  );
}
