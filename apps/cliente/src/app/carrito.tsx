import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { formatUsd, Price } from '@/components/price';
import { ScreenHeader } from '@/components/screen-header';
import { Stepper } from '@/components/stepper';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { getRestaurant } from '@/data/catalog';
import { lineTotal, useCart } from '@/store/cart';
import { goBack } from '@/lib/nav';

export default function Carrito() {
  const cart = useCart();
  const restaurant = cart.restaurantId ? getRestaurant(cart.restaurantId) : undefined;

  if (!cart.count) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <ScreenHeader title="Tu carrito" />
        <View style={styles.empty}>
          <Ionicons name="bag-handle-outline" size={64} color={Colors.orange} />
          <Text variant="title">Tu carrito está vacío</Text>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            Explora los restaurantes de San Felipe y agrega lo que se te antoje.
          </Text>
          <Button title="Explorar restaurantes" onPress={() => router.navigate('/(tabs)')} style={{ alignSelf: 'stretch', marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  const shortBy = restaurant ? restaurant.minimumUsd - cart.subtotalUsd : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader title="Tu carrito" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <Text variant="heading">{restaurant?.name}</Text>
        {cart.lines.map((line) => (
          <View key={line.key} style={styles.line}>
            <Image source={line.product.image} style={styles.thumb} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyStrong">{line.product.name}</Text>
              {line.options.length ? <Text variant="caption">{line.options.map((o) => o.name).join(' · ')}</Text> : null}
              {line.note ? <Text variant="caption">“{line.note}”</Text> : null}
              <View style={styles.lineBottom}>
                <Price usd={lineTotal(line)} size="sm" />
                <Stepper value={line.quantity} onChange={(q) => cart.setQuantity(line.key, q)} />
              </View>
            </View>
          </View>
        ))}
        <Button title="Agregar más productos" variant="ghost" onPress={goBack} />

        <View style={{ gap: 6 }}>
          <Text variant="heading">Nota para el restaurante</Text>
          <TextInput
            value={cart.generalNote}
            onChangeText={cart.setGeneralNote}
            placeholder="Ej. sin cubiertos, todo en una bolsa"
            placeholderTextColor={Colors.textMuted}
            style={styles.note}
            multiline
            accessibilityLabel="Nota general del pedido"
          />
        </View>

        <View style={styles.subtotal}>
          <Text style={{ color: Colors.textMuted }}>Subtotal de productos</Text>
          <Text variant="heading">{formatUsd(cart.subtotalUsd)}</Text>
        </View>
        {shortBy > 0 ? (
          <View style={styles.warning}>
            <Ionicons name="information-circle" size={18} color={Colors.crimson} />
            <Text style={{ color: Colors.crimson, flex: 1 }}>
              El pedido mínimo de {restaurant?.name} es {formatUsd(restaurant!.minimumUsd)}. Te faltan {formatUsd(shortBy)}.
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button title="Continuar al pago" disabled={shortBy > 0} onPress={() => router.push('/checkout')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  line: { flexDirection: 'row', gap: 12, backgroundColor: Colors.surface, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line },
  thumb: { width: 72, height: 72, borderRadius: 12 },
  lineBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  note: {
    minHeight: 60,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
    padding: 12,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  subtotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  warning: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: Radius.sm, backgroundColor: '#FDECEE' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.surface },
});
