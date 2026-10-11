import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { RestaurantGrid } from '@/components/restaurant-card';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { CATEGORIES, PRODUCTS, RESTAURANTS, type Restaurant } from '@/data/catalog';
import { CONTENT_MAX, useLayout } from '@/lib/layout';

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// RF-C03 sort options and filters.
const SORTS = [
  { id: 'recomendados', label: 'Recomendados', fn: (a: Restaurant, b: Restaurant) => a.recommended - b.recommended },
  { id: 'cercanos', label: 'Más cercanos', fn: (a: Restaurant, b: Restaurant) => a.distanceKm - b.distanceKm },
  { id: 'calificacion', label: 'Mejor calificados', fn: (a: Restaurant, b: Restaurant) => b.rating - a.rating },
  { id: 'rapidos', label: 'Entrega más rápida', fn: (a: Restaurant, b: Restaurant) => a.etaMin - b.etaMin },
] as const;

type Filters = { maxEta: number | null; maxDelivery: number | null; priceLevel: number | null; minRating: number | null; onlyOpen: boolean };
const NO_FILTERS: Filters = { maxEta: null, maxDelivery: null, priceLevel: null, minRating: null, onlyOpen: false };

const countFilters = (f: Filters) =>
  [f.maxEta, f.maxDelivery, f.priceLevel, f.minRating].filter((v) => v != null).length + (f.onlyOpen ? 1 : 0);

export default function Buscar() {
  const params = useLocalSearchParams<{ categoria?: string }>();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('recomendados');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sheet, setSheet] = useState(false);

  // The selected category lives in the route params so Home can deep-link into it.
  const category = params.categoria ?? null;
  const setCategory = (id: string | null) => router.setParams({ categoria: id ?? undefined });

  const q = normalize(query.trim());
  const results = RESTAURANTS.filter((r) => {
    if (category && r.category !== category) return false;
    if (filters.onlyOpen && !r.open) return false;
    if (filters.maxEta != null && r.etaMax > filters.maxEta) return false;
    if (filters.maxDelivery != null && r.deliveryUsd > filters.maxDelivery) return false;
    if (filters.priceLevel != null && r.priceLevel !== filters.priceLevel) return false;
    if (filters.minRating != null && r.rating < filters.minRating) return false;
    if (!q) return true;
    const dishes = PRODUCTS.filter((p) => p.restaurantId === r.id).map((p) => p.name);
    return [r.name, ...r.tags, ...dishes].some((t) => normalize(t).includes(q));
  }).sort(SORTS.find((s) => s.id === sort)!.fn);

  const active = countFilters(filters);
  const { wide } = useLayout();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
    <SafeAreaView edges={['top']} style={styles.page}>
      <View style={{ padding: 16, paddingTop: wide ? 28 : 16, gap: 14 }}>
        <Text variant="display">Buscar</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={styles.search}>
            <Ionicons name="search" size={20} color={Colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Restaurantes o platos"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              returnKeyType="search"
              accessibilityLabel="Buscar restaurantes o platos"
            />
            {query ? <Ionicons name="close-circle" size={20} color={Colors.textMuted} onPress={() => setQuery('')} /> : null}
          </View>
          <Pressable
            style={[styles.filterBtn, active > 0 && { backgroundColor: Colors.black }]}
            onPress={() => setSheet(true)}
            accessibilityLabel={`Filtros${active ? `, ${active} activos` : ''}`}>
            <Ionicons name="options" size={22} color={active ? Colors.white : Colors.black} />
            {active ? (
              <View style={styles.filterBadge}>
                <Text style={{ fontSize: 11, color: Colors.black, fontWeight: '700' }}>{active}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {[{ id: null, name: 'Todos' }, ...CATEGORIES].map((c) => (
            <Chip key={c.name} label={c.name} on={category === c.id} onPress={() => setCategory(c.id)} />
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="caption">
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
          </Text>
          <Pressable
            onPress={() => setSort(SORTS[(SORTS.findIndex((s) => s.id === sort) + 1) % SORTS.length].id)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            accessibilityLabel="Cambiar orden">
            <Ionicons name="swap-vertical" size={16} color={Colors.orangeDeep} />
            <Text variant="bodyStrong" style={{ color: Colors.orangeDeep, fontSize: 14 }}>
              {SORTS.find((s) => s.id === sort)!.label}
            </Text>
          </Pressable>
        </View>
        <RestaurantGrid restaurants={results} />
        {!results.length ? (
          <View style={{ alignItems: 'center', padding: 40, gap: 8 }}>
            <Ionicons name="sad-outline" size={44} color={Colors.textMuted} />
            <Text variant="heading">Nada por aquí</Text>
            <Text variant="caption" style={{ textAlign: 'center' }}>
              Prueba con otra palabra, quita algún filtro o pregúntale a Sion IA.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={sheet} animationType="slide" transparent onRequestClose={() => setSheet(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(false)} />
        <View style={[styles.sheet, wide && styles.sheetWide]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="title">Filtros y orden</Text>
            <Text variant="bodyStrong" style={{ color: Colors.orangeDeep }} onPress={() => setFilters(NO_FILTERS)}>
              Limpiar
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ gap: 18, paddingVertical: 12 }}>
            <Group title="Ordenar por">
              {SORTS.map((s) => (
                <Chip key={s.id} label={s.label} on={sort === s.id} onPress={() => setSort(s.id)} />
              ))}
            </Group>
            <Group title="Tiempo estimado">
              {[30, 45].map((m) => (
                <Chip key={m} label={`Hasta ${m} min`} on={filters.maxEta === m} onPress={() => setFilters({ ...filters, maxEta: filters.maxEta === m ? null : m })} />
              ))}
            </Group>
            <Group title="Costo de delivery">
              {[
                { v: 0, l: 'Gratis' },
                { v: 1.5, l: 'Hasta $1,50' },
              ].map(({ v, l }) => (
                <Chip key={l} label={l} on={filters.maxDelivery === v} onPress={() => setFilters({ ...filters, maxDelivery: filters.maxDelivery === v ? null : v })} />
              ))}
            </Group>
            <Group title="Rango de precio">
              {[1, 2, 3].map((p) => (
                <Chip key={p} label={'$'.repeat(p)} on={filters.priceLevel === p} onPress={() => setFilters({ ...filters, priceLevel: filters.priceLevel === p ? null : p })} />
              ))}
            </Group>
            <Group title="Calificación">
              {[4, 4.5].map((r) => (
                <Chip key={r} label={`★ ${r}+`} on={filters.minRating === r} onPress={() => setFilters({ ...filters, minRating: filters.minRating === r ? null : r })} />
              ))}
            </Group>
            <Group title="Disponibilidad">
              <Chip label="Solo abiertos" on={filters.onlyOpen} onPress={() => setFilters({ ...filters, onlyOpen: !filters.onlyOpen })} />
            </Group>
          </ScrollView>
          <Button title={`Ver ${results.length} resultados`} onPress={() => setSheet(false)} />
        </View>
      </Modal>
    </SafeAreaView>
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text variant="heading">{title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipActive]}>
      <Text variant="bodyStrong" style={{ fontSize: 14, color: on ? Colors.white : Colors.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' },
  search: {
    flex: 1,
    height: 50,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  input: { flex: 1, fontSize: 15, fontFamily: Fonts.body, color: Colors.text, height: '100%' },
  filterBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  chipActive: { backgroundColor: Colors.black, borderColor: Colors.black },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: '80%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: 20,
    paddingBottom: 32,
  },
  // On wide screens the filters open as a centred dialog instead of a bottom sheet.
  sheetWide: {
    position: 'absolute',
    top: '10%',
    left: '50%',
    width: 560,
    marginLeft: -280,
    borderRadius: Radius.lg,
  },
});
