import Ionicons from '@expo/vector-icons/Ionicons';
import type { AdminSummary, StatsPeriod } from '@sionmarket/contracts';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Chips, FormError } from '@/components/form';
import { PanelScreen } from '@/components/panel-screen';
import { formatUsd } from '@/components/price';
import { BarChart, RankList, StatCard, StatGrid, statStyles } from '@/components/stats';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { useLayout } from '@/lib/layout';
import { PERIODS, PREVIOUS_LABEL, STATUS_LABEL, admin } from '@/lib/panel';

const usd = (cents: number) => formatUsd(cents / 100);

export default function AdminResumen() {
  const { wide } = useLayout();
  const [period, setPeriod] = useState<StatsPeriod>('dia');
  const [data, setData] = useState<AdminSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setRefreshing(true);
    admin
      .summary(period)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setRefreshing(false));
  }, [period]);
  useFocusEffect(load);

  const vs = `vs ${PREVIOUS_LABEL[period]}`;
  const activeTotal = data?.activeOrders.reduce((n, a) => n + a.count, 0) ?? 0;

  return (
    <PanelScreen title="Resumen" subtitle="SionMarket" wide refreshing={refreshing} onRefresh={load}>
      <Chips options={PERIODS} value={period} onChange={(p) => (setData(null), setPeriod(p))} />
      <FormError message={error} />
      {!data ? (
        <ActivityIndicator color={Colors.orange} />
      ) : (
        <>
          {data.pendingRequests > 0 ? (
            <Pressable style={styles.alert} onPress={() => router.push('/admin/solicitudes')}>
              <Ionicons name="mail-unread" size={22} color={Colors.black} />
              <Text variant="heading" style={{ flex: 1, color: Colors.black }}>
                {data.pendingRequests === 1 ? '1 comercio quiere unirse' : `${data.pendingRequests} comercios quieren unirse`}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.black} />
            </Pressable>
          ) : null}
          <StatGrid wide={wide}>
            <StatCard label="Ventas de comida" value={usd(data.totals.salesCents)} current={data.totals.salesCents} previous={data.previous.salesCents} hint={vs} />
            <StatCard label="Pedidos" value={String(data.totals.orders)} current={data.totals.orders} previous={data.previous.orders} hint={vs} />
            <StatCard label="Delivery y propinas" value={usd(data.deliveryCents)} hint="lo que cobra SionMarket" />
            <StatCard
              label="Rechazados o cancelados"
              value={String(data.totals.rejected + data.totals.cancelled)}
              hint={data.totals.orders ? `${Math.round(((data.totals.rejected + data.totals.cancelled) / data.totals.orders) * 100)}% de los pedidos` : undefined}
            />
          </StatGrid>
          <BarChart
            title={period === 'dia' ? 'Ventas por hora' : 'Ventas por día'}
            points={data.series}
            format={(p) => `${usd(p.salesCents)} · ${p.orders} ${p.orders === 1 ? 'pedido' : 'pedidos'}`}
          />
          <StatGrid wide={wide}>
            <Tile
              icon="storefront"
              label="Restaurantes activos"
              value={`${data.restaurants.enabled} de ${data.restaurants.total}`}
              detail={`${data.restaurants.open} abiertos ahora`}
              href="/admin/locales"
            />
            <Tile icon="map" label="Zonas activas" value={`${data.zones.active} de ${data.zones.total}`} href="/admin/zonas" />
            <Tile icon="receipt" label="Pedidos en curso" value={String(activeTotal)} detail="ahora mismo" href="/admin/pedidos" />
            <Tile
              icon="people"
              label="Cuentas"
              value={String(data.users.total)}
              detail={`${data.users.restaurante} restaurantes · ${data.users.repartidor} repartidores`}
              href="/admin/usuarios"
            />
          </StatGrid>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: 12 }}>
            <View style={[statStyles.card, { flex: 1 }]}>
              <Text variant="heading">Restaurantes que más venden</Text>
              <RankList
                rows={data.topRestaurants.map((r) => ({
                  key: r.id,
                  label: r.name,
                  detail: `${r.orders} ped. · ${usd(r.salesCents)}`,
                  value: r.salesCents,
                }))}
                empty="Sin pedidos en este periodo."
              />
            </View>
            <View style={[statStyles.card, { flex: 1 }]}>
              <Text variant="heading">Pedidos en curso por estado</Text>
              {data.activeOrders.length ? (
                data.activeOrders.map((a) => (
                  <View key={a.status} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text>{STATUS_LABEL[a.status]}</Text>
                    <Text variant="bodyStrong">{a.count}</Text>
                  </View>
                ))
              ) : (
                <Text variant="caption">No hay pedidos en curso.</Text>
              )}
            </View>
          </View>
        </>
      )}
    </PanelScreen>
  );
}

function Tile({ icon, label, value, detail, href }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; detail?: string; href: Href }) {
  return (
    <Pressable style={statStyles.tile} onPress={() => router.navigate(href)} accessibilityRole="link">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name={icon} size={18} color={Colors.orangeDeep} />
        <Text variant="caption" style={{ flex: 1 }}>
          {label}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
      </View>
      <Text variant="title">{value}</Text>
      {detail ? <Text variant="caption">{detail}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  alert: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: Radius.md, backgroundColor: Colors.orange },
});
