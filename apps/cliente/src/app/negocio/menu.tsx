import Ionicons from '@expo/vector-icons/Ionicons';
import type { Product, RestaurantDetail } from '@sionmarket/contracts';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chips, FormError, formStyles } from '@/components/form';
import { NegocioScreen } from '@/components/negocio-gate';
import { formatUsd } from '@/components/price';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { panel } from '@/lib/panel';
import { negocio } from '@/store/negocio';

type Filter = 'todos' | 'agotados' | 'opciones';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'agotados', label: 'Agotados' },
  { id: 'opciones', label: 'Con opciones' },
];

const matches = (p: Product, filter: Filter, q: string) =>
  (filter === 'todos' || (filter === 'agotados' ? p.soldOut : p.modifierGroups.length > 0)) &&
  (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));

function Menu({ restaurant }: { restaurant: RestaurantDetail }) {
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('todos');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const all = restaurant.sections.flatMap((s) => s.products);

  // Coming back from the dish editor shows the saved changes.
  useFocusEffect(
    useCallback(() => {
      void negocio.reload();
    }, []),
  );

  const toggleSoldOut = async (productId: string, soldOut: boolean) => {
    const apply = (value: boolean) =>
      negocio.patch((r) => ({
        ...r,
        sections: r.sections.map((s) => ({ ...s, products: s.products.map((p) => (p.id === productId ? { ...p, soldOut: value } : p)) })),
      }));
    apply(soldOut);
    try {
      await panel.updateProduct(restaurant.id, productId, { soldOut });
    } catch (e) {
      apply(!soldOut);
      setError((e as Error).message);
    }
  };

  const sections = restaurant.sections
    .map((s) => ({ ...s, products: s.products.filter((p) => matches(p, filter, q)) }))
    .filter((s) => s.products.length);

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text variant="caption">{restaurant.name}</Text>
          <Text variant="display">Menú</Text>
        </View>
        <Text variant="caption">
          {all.length} platos · {all.filter((p) => p.soldOut).length} agotados
        </Text>
      </View>
      <Button title="Agregar un plato" onPress={() => router.push({ pathname: '/panel/plato', params: { restaurante: restaurant.id } })} />
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar un plato"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          accessibilityLabel="Buscar un plato"
        />
      </View>
      <Chips options={FILTERS} value={filter} onChange={setFilter} />
      <FormError message={error} />
      {all.length === 0 ? (
        <Text variant="caption" style={{ textAlign: 'center' }}>
          El menú está vacío. Agrega tus platos para que los clientes puedan pedir.
        </Text>
      ) : sections.length === 0 ? (
        <Text variant="caption" style={{ textAlign: 'center' }}>
          Ningún plato coincide.
        </Text>
      ) : null}
      {sections.map((section) => (
        <View key={section.name} style={formStyles.card}>
          <Text variant="label">{section.name}</Text>
          {section.products.map((p) => (
            <View key={p.id} style={styles.product}>
              <Pressable
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${p.name}`}
                onPress={() => router.push({ pathname: '/panel/plato', params: { restaurante: restaurant.id, id: p.id } })}>
                {p.imageUrl ? (
                  <Image source={p.imageUrl} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="fast-food-outline" size={20} color={Colors.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong" style={p.soldOut && { color: Colors.textMuted, textDecorationLine: 'line-through' }}>
                    {p.name}
                  </Text>
                  <Text variant="caption">
                    {formatUsd(p.priceCents / 100)}
                    {p.popular ? ' · Popular' : ''}
                    {p.modifierGroups.length ? ` · ${p.modifierGroups.length} ${p.modifierGroups.length === 1 ? 'grupo de opciones' : 'grupos de opciones'}` : ''}
                  </Text>
                </View>
              </Pressable>
              <View style={{ alignItems: 'center' }}>
                <Switch
                  value={!p.soldOut}
                  onValueChange={(available) => toggleSoldOut(p.id, !available)}
                  accessibilityLabel={`${p.name} disponible`}
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
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
  },
  searchInput: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.text, height: '100%' },
  product: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.line },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: Colors.background },
});

export default function MenuScreen() {
  return <NegocioScreen>{(r) => <Menu restaurant={r} />}</NegocioScreen>;
}
