import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { formatUsd, formatVes } from '@/components/price';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { getRestaurant } from '@/data/catalog';
import { useOrders } from '@/store/orders';
import { useRequireLogin } from '@/lib/auth-gate';

// RF-C08: delivery-service invoice issued by the platform. The fiscal number will come from the e-invoicing provider.
function Factura() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { get } = useOrders();
  const order = get(id);
  if (!order) return null;
  const restaurant = getRestaurant(order.restaurantId);
  const t = order.totals;
  const date = new Date(order.createdAt).toLocaleString('es-VE');
  const number = `00-${order.code.replace('SM-', '').padStart(8, '0')}`;

  const rows: [string, number][] = [
    ['Servicio de delivery', t.deliveryBaseUsd],
    ...(t.deliveryDiscountUsd ? ([['Descuento (cupón)', -t.deliveryDiscountUsd]] as [string, number][]) : []),
    ...(t.tipUsd ? ([['Propina al repartidor (no gravable)', t.tipUsd]] as [string, number][]) : []),
  ];

  const share = () =>
    Share.share({
      message: `Sionmarket · Factura del servicio de delivery N° ${number}\nPedido ${order.code} · ${date}\n${rows
        .map(([l, v]) => `${l}: ${formatUsd(v)}`)
        .join('\n')}\nTotal: ${formatUsd(t.platformTotalUsd)} (${formatVes(t.platformTotalUsd)})`,
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader title="Factura del delivery" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={styles.paper}>
          <Logo height={40} />
          <Text variant="caption">Sionmarket C.A. · RIF J-00000000-0 (demo) · San Felipe, Yaracuy</Text>
          <View style={styles.sep} />
          <Text variant="bodyStrong">Factura N° {number}</Text>
          <Text variant="caption">
            Pedido {order.code} · {date}
          </Text>
          <Text variant="caption">Cliente: {order.address.alias} · {order.address.street}</Text>
          <View style={styles.sep} />
          {rows.map(([label, v]) => (
            <View key={label} style={styles.row}>
              <Text style={{ flex: 1 }}>{label}</Text>
              <Text variant="bodyStrong">{v < 0 ? `-${formatUsd(-v)}` : formatUsd(v)}</Text>
            </View>
          ))}
          <View style={styles.sep} />
          <View style={styles.row}>
            <Text variant="heading">Total</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="heading">{formatUsd(t.platformTotalUsd)}</Text>
              <Text variant="caption">{formatVes(t.platformTotalUsd)}</Text>
            </View>
          </View>
          <Text variant="caption" style={{ marginTop: 8 }}>
            Pagado con {order.payment}. Los productos ({formatUsd(t.restaurantTotalUsd)}) los factura {restaurant?.name ?? 'el restaurante'}.
          </Text>
        </View>
        <Button title="Descargar o compartir" variant="dark" onPress={share} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  paper: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 18, gap: 6, borderWidth: 1, borderColor: Colors.line },
  sep: { height: 1, backgroundColor: Colors.line, marginVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});

// Only for signed-in customers; visitors are sent to sign in first.
export default function FacturaScreen() {
  return useRequireLogin() ? <Factura /> : null;
}
