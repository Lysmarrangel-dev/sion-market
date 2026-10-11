import { StyleSheet, View } from 'react-native';

import { formatUsd, formatVes } from '@/components/price';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import type { CartTotals } from '@/store/cart';

// RF-C05 breakdown: the restaurant invoices the food; Sionmarket invoices only the delivery.
export function OrderSummary({ totals, restaurantName }: { totals: CartTotals; restaurantName?: string }) {
  return (
    <View style={styles.box}>
      <Text variant="label" style={{ color: Colors.textMuted }}>
        Factura {restaurantName ?? 'del restaurante'}
      </Text>
      <Row label="Subtotal de productos" value={totals.subtotalUsd} />
      {totals.productDiscountUsd ? <Row label="Cupón en productos" value={-totals.productDiscountUsd} accent /> : null}
      <View style={styles.sep} />
      <Text variant="label" style={{ color: Colors.textMuted }}>
        Factura Sionmarket
      </Text>
      <Row label="Costo de delivery" value={totals.deliveryBaseUsd} />
      {totals.deliveryDiscountUsd ? <Row label="Cupón en delivery" value={-totals.deliveryDiscountUsd} accent /> : null}
      {totals.tipUsd ? <Row label="Propina (100% para el repartidor)" value={totals.tipUsd} /> : null}
      <View style={styles.sep} />
      <View style={styles.row}>
        <Text variant="title">Total</Text>
        <Text variant="title">{formatUsd(totals.totalUsd)}</Text>
      </View>
      <View style={styles.row}>
        <Text variant="caption">Total en bolívares (tasa BCV)</Text>
        <Text variant="bodyStrong">{formatVes(totals.totalUsd)}</Text>
      </View>
    </View>
  );
}

function Row({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={{ color: accent ? Colors.success : Colors.textMuted, flex: 1 }}>{label}</Text>
      <Text variant="bodyStrong" style={accent ? { color: Colors.success } : undefined}>
        {value < 0 ? `-${formatUsd(-value)}` : formatUsd(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 16, gap: 8, borderWidth: 1, borderColor: Colors.line },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sep: { height: 1, backgroundColor: Colors.line, marginVertical: 4 },
});
