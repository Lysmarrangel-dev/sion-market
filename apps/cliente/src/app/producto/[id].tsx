import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { formatUsd, formatVes, Price } from '@/components/price';
import { Stepper } from '@/components/stepper';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { getProduct, getRestaurant, type ModifierGroup } from '@/data/catalog';
import { confirm } from '@/lib/confirm';
import { unitPrice, useCart, type SelectedOption } from '@/store/cart';

// Human-readable rule for a modifier group (RF-C04).
function ruleText(g: ModifierGroup) {
  if (g.max === 1) return g.required ? 'Obligatorio · elige 1' : 'Opcional · elige 1';
  if (g.required) return g.min === g.max ? `Obligatorio · elige ${g.min}` : `Obligatorio · elige de ${g.min} a ${g.max}`;
  return `Opcional · hasta ${g.max}`;
}

export default function ProductoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const product = getProduct(id);
  const [quantity, setQuantity] = useState(1);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [note, setNote] = useState('');

  if (!product) return null;
  const restaurant = getRestaurant(product.restaurantId);
  const groups = product.modifiers ?? [];

  const options: SelectedOption[] = groups.flatMap((g) =>
    g.options.filter((o) => picked[g.id]?.includes(o.id)).map((o) => ({ ...o, groupId: g.id, groupName: g.name })),
  );
  const missing = groups.filter((g) => (picked[g.id]?.length ?? 0) < (g.required ? g.min : 0));
  const total = unitPrice({ product, options }) * quantity;

  const toggle = (g: ModifierGroup, optionId: string) =>
    setPicked((prev) => {
      const current = prev[g.id] ?? [];
      if (g.max === 1) return { ...prev, [g.id]: current[0] === optionId && !g.required ? [] : [optionId] };
      if (current.includes(optionId)) return { ...prev, [g.id]: current.filter((x) => x !== optionId) };
      if (current.length >= g.max) return prev;
      return { ...prev, [g.id]: [...current, optionId] };
    });

  const add = async () => {
    if (cart.restaurantId && cart.restaurantId !== product.restaurantId) {
      const other = getRestaurant(cart.restaurantId)?.name ?? 'otro restaurante';
      const ok = await confirm(
        '¿Vaciar el carrito?',
        `Tu carrito tiene productos de ${other}. Solo puedes pedir de un restaurante a la vez.`,
        'Vaciar y agregar',
      );
      if (!ok) return;
    }
    cart.add({ product, quantity, options, note: note.trim() || undefined });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
        <Image source={product.image} style={styles.image} contentFit="cover" />
        <View style={{ padding: 20, gap: 8 }}>
          <Text variant="caption">{restaurant?.name}</Text>
          <Text variant="display">{product.name}</Text>
          <Text style={{ color: Colors.textMuted }}>{product.description}</Text>
          <Price usd={product.priceUsd} size="lg" style={{ marginTop: 6 }} />
        </View>

        {groups.map((g) => {
          const count = picked[g.id]?.length ?? 0;
          const incomplete = g.required && count < g.min;
          return (
            <View key={g.id} style={styles.block}>
              <View style={styles.blockHead}>
                <View style={{ flex: 1 }}>
                  <Text variant="heading">{g.name}</Text>
                  <Text variant="caption">{ruleText(g)}</Text>
                </View>
                {g.required ? (
                  <View style={[styles.badge, !incomplete && styles.badgeDone]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: incomplete ? Colors.white : Colors.success }}>
                      {incomplete ? 'Requerido' : '✓ Listo'}
                    </Text>
                  </View>
                ) : null}
              </View>
              {g.options.map((o) => {
                const on = !!picked[g.id]?.includes(o.id);
                const blocked = !on && g.max > 1 && count >= g.max;
                return (
                  <Pressable
                    key={o.id}
                    style={[styles.option, blocked && { opacity: 0.4 }]}
                    onPress={() => toggle(g, o.id)}
                    disabled={blocked}
                    accessibilityRole={g.max === 1 ? 'radio' : 'checkbox'}
                    accessibilityState={{ checked: on, disabled: blocked }}>
                    <View style={[g.max === 1 ? styles.radio : styles.check, on && styles.on]}>
                      {on ? (
                        g.max === 1 ? (
                          <View style={styles.radioDot} />
                        ) : (
                          <Ionicons name="checkmark" size={16} color={Colors.black} />
                        )
                      ) : null}
                    </View>
                    <Text style={{ flex: 1 }}>{o.name}</Text>
                    {o.priceUsd ? <Text variant="bodyStrong">+{formatUsd(o.priceUsd)}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        <View style={styles.block}>
          <Text variant="heading">Nota para este producto</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Ej. salsa aparte, bien tostado"
            placeholderTextColor={Colors.textMuted}
            style={styles.note}
            multiline
            accessibilityLabel="Nota para este producto"
          />
        </View>
      </ScrollView>

      <View style={[styles.close, { top: 16 }]}>
        <IconButton name="close" light onPress={() => router.back()} />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {missing.length ? (
          <Text variant="caption" style={{ textAlign: 'center', color: Colors.crimson }}>
            Falta elegir: {missing.map((g) => g.name.toLowerCase()).join(', ')}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Stepper value={quantity} onChange={setQuantity} min={1} />
          <View style={{ flex: 1 }}>
            <Button title={`Agregar  ${formatUsd(total)}`} onPress={add} disabled={missing.length > 0} />
          </View>
        </View>
        <Text variant="caption" style={{ textAlign: 'right' }}>
          {formatVes(total)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 260 },
  block: { marginHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: Colors.line, gap: 10 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: Colors.crimson },
  badgeDone: { backgroundColor: '#E8F6EE' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.black },
  on: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  note: {
    minHeight: 70,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.background,
    padding: 12,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  close: { position: 'absolute', right: 16 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 6,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
});
