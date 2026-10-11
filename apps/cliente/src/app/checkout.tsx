import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { formatUsd } from '@/components/price';
import { ScreenHeader } from '@/components/screen-header';
import { OrderSummary } from '@/components/summary';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { findCoupon, getRestaurant } from '@/data/catalog';
import { requestNotificationPermission } from '@/lib/notify';
import { useAddresses } from '@/store/addresses';
import { computeTotals, useCart } from '@/store/cart';
import { useOrders } from '@/store/orders';

const METHODS: { id: string; label: string; detail: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'Pago Móvil', label: 'Pago Móvil', detail: 'Bs. al cambio BCV del día', icon: 'phone-portrait-outline' },
  { id: 'Transferencia', label: 'Transferencia', detail: 'Bancos nacionales', icon: 'swap-horizontal-outline' },
  { id: 'Tarjeta', label: 'Tarjeta', detail: 'Débito o crédito', icon: 'card-outline' },
  { id: 'Efectivo', label: 'Efectivo', detail: 'USD o Bs. al recibir', icon: 'cash-outline' },
];

const TIPS = [0, 0.5, 1, 2];

export default function Checkout() {
  const cart = useCart();
  const { selected: address } = useAddresses();
  const { place } = useOrders();
  const [method, setMethod] = useState('Pago Móvil');
  const [placing, setPlacing] = useState(false);
  const [customTip, setCustomTip] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState(false);
  const restaurant = cart.restaurantId ? getRestaurant(cart.restaurantId) : undefined;
  const coupon = cart.couponCode ? findCoupon(cart.couponCode) : undefined;

  // ETA before confirming (RF-C05): restaurant prep window plus a ride estimate by distance.
  const ride = restaurant ? Math.round(restaurant.distanceKm * 3) : 0;
  const eta = restaurant ? `${restaurant.etaMin + ride}–${restaurant.etaMax + ride} min` : '';

  const placeOrder = () => {
    if (!restaurant || !address) return;
    setPlacing(true);
    requestNotificationPermission();
    const { lines, generalNote, couponCode } = cart;
    // The server recomputes every amount; the totals shown here are a preview.
    place({ restaurantId: restaurant.id, lines, generalNote, couponCode, totals: computeTotals(cart), address, payment: method })
      .then((id) => {
        cart.clear();
        router.dismissAll();
        router.push({ pathname: '/pedido/[id]', params: { id } });
      })
      .catch((e: unknown) => {
        setPlacing(false);
        Alert.alert('No pudimos enviar tu pedido', e instanceof Error ? e.message : 'Revisa tu conexión e intenta de nuevo.');
      });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader title="Pagar" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <Section title="Dirección de entrega">
          <Pressable style={styles.card} onPress={() => router.push({ pathname: '/direcciones', params: { elegir: '1' } })}>
            <Ionicons name="location" size={22} color={Colors.orangeDeep} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{address?.alias ?? 'Agrega una dirección'}</Text>
              {address ? (
                <>
                  <Text variant="caption">{address.street}</Text>
                  <Text variant="caption">Ref.: {address.reference}</Text>
                </>
              ) : null}
            </View>
            <Text variant="bodyStrong" style={{ color: Colors.orangeDeep }}>
              Cambiar
            </Text>
          </Pressable>
          <View style={styles.eta}>
            <Ionicons name="time-outline" size={18} color={Colors.text} />
            <Text>
              Llega en <Text variant="bodyStrong">{eta}</Text> aprox.
            </Text>
          </View>
        </Section>

        <Section title="Método de pago">
          {METHODS.map((m) => {
            const on = m.id === method;
            return (
              <Pressable
                key={m.id}
                onPress={() => setMethod(m.id)}
                style={[styles.card, on && styles.cardOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}>
                <Ionicons name={m.icon} size={22} color={on ? Colors.black : Colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{m.label}</Text>
                  <Text variant="caption">{m.detail}</Text>
                </View>
                <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
              </Pressable>
            );
          })}
        </Section>

        <Section title="Propina para el repartidor" subtitle="Opcional · el 100% es para quien te lleva el pedido">
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            {TIPS.map((t) => {
              const on = !customTip && cart.tipUsd === t;
              return (
                <Pressable
                  key={t}
                  style={[styles.tip, on && styles.tipOn]}
                  onPress={() => {
                    setCustomTip('');
                    cart.setTip(t);
                  }}>
                  <Text variant="bodyStrong" style={{ color: on ? Colors.white : Colors.text }}>
                    {t ? formatUsd(t) : 'Sin propina'}
                  </Text>
                </Pressable>
              );
            })}
            <TextInput
              value={customTip}
              onChangeText={(v) => {
                const clean = v.replace(',', '.').replace(/[^0-9.]/g, '');
                setCustomTip(clean);
                cart.setTip(Number(clean) || 0);
              }}
              placeholder="Otro $"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
              style={[styles.tip, styles.tipInput, customTip ? styles.tipOn : null, customTip ? { color: Colors.white } : null]}
              accessibilityLabel="Otro monto de propina"
            />
          </View>
        </Section>

        <Section title="Cupón de descuento">
          {coupon ? (
            <View style={[styles.card, { borderColor: Colors.success, backgroundColor: '#E8F6EE' }]}>
              <Ionicons name="pricetag" size={20} color={Colors.success} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{coupon.code}</Text>
                <Text variant="caption">{coupon.label}</Text>
              </View>
              <Text variant="bodyStrong" style={{ color: Colors.crimson }} onPress={cart.removeCoupon}>
                Quitar
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={couponInput}
                onChangeText={(v) => {
                  setCouponInput(v);
                  setCouponError(false);
                }}
                placeholder="Ej. SIONNUEVO"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                style={[styles.couponInput, couponError && { borderColor: Colors.crimson }]}
                accessibilityLabel="Código de cupón"
              />
              <Button
                title="Aplicar"
                variant="dark"
                style={{ height: 50 }}
                disabled={!couponInput.trim()}
                onPress={() => setCouponError(!cart.applyCoupon(couponInput))}
              />
            </View>
          )}
          {couponError ? (
            <Text variant="caption" style={{ color: Colors.crimson }}>
              Ese cupón no existe o ya venció.
            </Text>
          ) : null}
        </Section>

        <OrderSummary totals={cart} restaurantName={restaurant?.name} />

        <View style={styles.legal}>
          <Ionicons name="document-text-outline" size={18} color={Colors.textMuted} />
          <Text variant="caption" style={{ flex: 1 }}>
            La factura fiscal de los productos la emite {restaurant?.name ?? 'el restaurante'}. Sionmarket factura solo el servicio de
            entrega.
          </Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title={placing ? 'Enviando pedido…' : `Confirmar pedido · ${formatUsd(cart.totalUsd)}`}
          onPress={placeOrder}
          disabled={placing || !cart.count || !address}
          right={placing ? <ActivityIndicator color={Colors.black} /> : undefined}
        />
      </View>
    </SafeAreaView>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View>
        <Text variant="heading">{title}</Text>
        {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.line,
  },
  cardOn: { borderColor: Colors.orange, backgroundColor: Colors.orangeSoft },
  eta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: Colors.black },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.black },
  tip: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  tipOn: { backgroundColor: Colors.black, borderColor: Colors.black },
  tipInput: { width: 90, fontFamily: Fonts.bodyBold, fontSize: 15, color: Colors.text, textAlign: 'center' },
  couponInput: {
    flex: 1,
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    fontFamily: Fonts.bodyMedium,
    fontSize: 15,
    color: Colors.text,
  },
  legal: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: Radius.sm, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.surface },
});
