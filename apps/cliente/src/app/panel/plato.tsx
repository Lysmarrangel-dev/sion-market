import Ionicons from '@expo/vector-icons/Ionicons';
import type { ModifierGroup, ModifierGroupInput, RestaurantDetail } from '@sionmarket/contracts';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chips, Field, FormError, Toggle, formStyles } from '@/components/form';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { useRequireLogin } from '@/lib/auth-gate';
import { goBack } from '@/lib/nav';
import { centsText, panel, parseUsd } from '@/lib/panel';

type Form = { section: string; name: string; description: string; price: string; imageUrl: string; popular: boolean; soldOut: boolean };

const EMPTY: Form = { section: '', name: '', description: '', price: '', imageUrl: '', popular: false, soldOut: false };

// Customization as edited on screen: prices are text until saved.
type OptionForm = { id?: string; name: string; price: string };
type GroupForm = { key: string; id?: string; name: string; required: boolean; max: number; options: OptionForm[] };

let nextKey = 0;
const newKey = () => `g${++nextKey}`;

const fromGroup = (g: ModifierGroup): GroupForm => ({
  key: newKey(),
  id: g.id,
  name: g.name,
  required: g.required,
  max: g.max,
  options: g.options.map((o) => ({ id: o.id, name: o.name, price: o.priceCents ? centsText(o.priceCents) : '' })),
});

/** Starting points for the usual kinds of options. */
const PRESETS: { label: string; group: Omit<GroupForm, 'key'> }[] = [
  { label: 'Tamaño', group: { name: 'Tamaño', required: true, max: 1, options: [{ name: 'Normal', price: '' }, { name: 'Grande', price: '1.00' }] } },
  { label: 'Adicionales', group: { name: 'Adicionales', required: false, max: 3, options: [{ name: 'Queso extra', price: '0.50' }, { name: 'Tocineta', price: '1.00' }, { name: 'Huevo', price: '0.50' }] } },
  { label: 'Salsas', group: { name: 'Salsas', required: false, max: 2, options: [{ name: 'Ajo', price: '' }, { name: 'Tártara', price: '' }] } },
  { label: 'Quitar ingredientes', group: { name: 'Quitar ingredientes', required: false, max: 3, options: [{ name: 'Sin cebolla', price: '' }, { name: 'Sin tomate', price: '' }] } },
  { label: 'En blanco', group: { name: '', required: false, max: 1, options: [{ name: '', price: '' }] } },
];

/** Checks the groups and turns them into what the API takes, or returns what to fix. */
const MAX_GROUPS = 10;

function toCustomization(groups: GroupForm[]): ModifierGroupInput[] | string {
  if (groups.length > MAX_GROUPS) return `Un plato puede tener hasta ${MAX_GROUPS} grupos de opciones.`;
  const out: ModifierGroupInput[] = [];
  for (const g of groups) {
    const name = g.name.trim() || 'el grupo sin nombre';
    if (!g.name.trim()) return 'Ponle nombre a cada grupo de opciones (por ejemplo, Tamaño).';
    const options = g.options.filter((o) => o.name.trim() || o.price.trim());
    if (!options.length) return `Agrega al menos una opción en «${name}».`;
    const parsed = [];
    for (const o of options) {
      if (!o.name.trim()) return `Escribe el nombre de cada opción en «${name}».`;
      const priceCents = o.price.trim() ? parseUsd(o.price) : 0;
      if (priceCents === null) return `El precio de «${o.name.trim()}» no es válido. Usa por ejemplo 0.50.`;
      parsed.push({ ...(o.id ? { id: o.id } : {}), name: o.name.trim(), priceCents });
    }
    out.push({ ...(g.id ? { id: g.id } : {}), name: g.name.trim(), required: g.required, max: Math.min(g.max, parsed.length), options: parsed });
  }
  return out;
}

function Plato() {
  const { restaurante, id } = useLocalSearchParams<{ restaurante: string; id?: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [form, setForm] = useState<Form | null>(id ? null : EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<GroupForm[]>([]);
  const [groupsChanged, setGroupsChanged] = useState(false);

  useEffect(() => {
    panel
      .detail(restaurante)
      .then((r) => {
        setRestaurant(r);
        if (!id) return setForm((f) => ({ ...(f ?? EMPTY), section: f?.section || r.sections[0]?.name || '' }));
        const p = r.sections.flatMap((s) => s.products).find((x) => x.id === id);
        if (!p) return setError('Ese plato ya no existe.');
        setForm({
          section: p.section,
          name: p.name,
          description: p.description,
          price: centsText(p.priceCents),
          imageUrl: p.imageUrl ?? '',
          popular: p.popular,
          soldOut: p.soldOut,
        });
        setGroups(p.modifierGroups.map(fromGroup));
      })
      .catch((e) => setError(e.message));
  }, [restaurante, id]);

  const title = id ? 'Editar plato' : 'Nuevo plato';
  if (!form || !restaurant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <ScreenHeader title={title} />
        {error ? <FormError message={error} /> : <ActivityIndicator color={Colors.orange} style={{ marginTop: 40 }} />}
      </SafeAreaView>
    );
  }

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const sections = restaurant.sections.map((s) => ({ id: s.name, label: s.name }));

  const editGroups = (fn: (list: GroupForm[]) => GroupForm[]) => {
    setGroups(fn);
    setGroupsChanged(true);
  };
  const editGroup = (key: string, patch: Partial<GroupForm>) => editGroups((list) => list.map((g) => (g.key === key ? { ...g, ...patch } : g)));

  const save = async () => {
    const priceCents = parseUsd(form.price);
    if (!form.section.trim()) return setError('Escribe o elige la sección del menú (por ejemplo, Bebidas).');
    if (form.name.trim().length < 2) return setError('Escribe el nombre del plato.');
    if (!priceCents) return setError('Escribe el precio en dólares, por ejemplo 3.50.');
    if (form.imageUrl.trim() && !/^https?:\/\/\S+$/.test(form.imageUrl.trim())) return setError('La foto debe ser un enlace que empiece con https://');
    const customization = toCustomization(groups);
    if (typeof customization === 'string') return setError(customization);
    const input = {
      section: form.section.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      priceCents,
      imageUrl: form.imageUrl.trim() || null,
      popular: form.popular,
      soldOut: form.soldOut,
    };
    setError(null);
    setSaving(true);
    try {
      const saved = id ? await panel.updateProduct(restaurante, id, input) : await panel.addProduct(restaurante, input);
      if (groupsChanged) await panel.setCustomization(restaurante, saved.id, { groups: customization });
      goBack();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !(await confirm('Borrar plato', `¿Quitar ${form.name} del menú?`, 'Borrar'))) return;
    try {
      await panel.removeProduct(restaurante, id);
      goBack();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader title={title} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={formStyles.card}>
            <View style={{ gap: 6 }}>
              {sections.length ? <Chips options={sections} value={form.section} onChange={set('section')} /> : null}
              <Field label="Sección del menú" value={form.section} onChangeText={set('section')} placeholder="Arepas, Bebidas, Postres…" />
            </View>
            <Field label="Nombre" value={form.name} onChangeText={set('name')} placeholder="Reina pepiada" />
            <Field label="Descripción" value={form.description} onChangeText={set('description')} multiline placeholder="Pollo, aguacate y mayonesa" />
            <Field label="Precio (USD)" value={form.price} onChangeText={set('price')} keyboardType="decimal-pad" placeholder="3.50" />
            <Field label="Foto (enlace, opcional)" value={form.imageUrl} onChangeText={set('imageUrl')} autoCapitalize="none" keyboardType="url" placeholder="https://…" />
          </View>
          <View style={formStyles.card}>
            <Toggle label="Popular" detail="Sale destacado en la ficha del restaurante." value={form.popular} onChange={set('popular')} />
            <Toggle label="Agotado" detail="Los clientes lo ven pero no lo pueden pedir." value={form.soldOut} onChange={set('soldOut')} />
          </View>
          <View style={formStyles.card}>
            <View>
              <Text variant="heading">Personalización</Text>
              <Text variant="caption">Tamaños, adicionales, salsas o ingredientes que el cliente puede elegir o quitar.</Text>
            </View>
            {groups.map((g, gi) => (
              <View key={g.key} style={styles.group}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput
                    value={g.name}
                    onChangeText={(name) => editGroup(g.key, { name })}
                    placeholder="Nombre del grupo (Tamaño, Salsas…)"
                    placeholderTextColor={Colors.textMuted}
                    accessibilityLabel={`Nombre del grupo ${gi + 1}`}
                    style={[styles.input, { flex: 1, minWidth: 0, fontFamily: Fonts.bodyBold }]}
                  />
                  <Pressable
                    onPress={() => editGroups((list) => list.filter((x) => x.key !== g.key))}
                    accessibilityLabel={`Quitar el grupo ${g.name || gi + 1}`}
                    style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                  </Pressable>
                </View>
                <Toggle
                  label="Obligatorio"
                  detail={g.required ? 'El cliente tiene que elegir al menos una.' : 'El cliente puede no elegir ninguna.'}
                  value={g.required}
                  onChange={(required) => editGroup(g.key, { required })}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    Puede elegir hasta
                  </Text>
                  <Pressable style={styles.iconBtn} onPress={() => editGroup(g.key, { max: Math.max(1, g.max - 1) })} accessibilityLabel="Menos">
                    <Ionicons name="remove" size={20} color={Colors.ink} />
                  </Pressable>
                  <Text variant="heading" style={{ minWidth: 20, textAlign: 'center' }}>
                    {g.max}
                  </Text>
                  <Pressable
                    style={styles.iconBtn}
                    onPress={() => editGroup(g.key, { max: Math.min(g.options.length || 1, g.max + 1) })}
                    accessibilityLabel="Más">
                    <Ionicons name="add" size={20} color={Colors.ink} />
                  </Pressable>
                </View>
                {g.options.map((o, oi) => {
                  const setOption = (patch: Partial<OptionForm>) =>
                    editGroup(g.key, { options: g.options.map((x, i) => (i === oi ? { ...x, ...patch } : x)) });
                  return (
                    <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TextInput
                        value={o.name}
                        onChangeText={(name) => setOption({ name })}
                        placeholder="Opción"
                        placeholderTextColor={Colors.textMuted}
                        accessibilityLabel={`Opción ${oi + 1} de ${g.name || 'el grupo'}`}
                        style={[styles.input, { flex: 1, minWidth: 0 }]}
                      />
                      <TextInput
                        value={o.price}
                        onChangeText={(price) => setOption({ price })}
                        placeholder="+ $0"
                        keyboardType="decimal-pad"
                        placeholderTextColor={Colors.textMuted}
                        accessibilityLabel={`Precio extra de ${o.name || `la opción ${oi + 1}`}`}
                        style={[styles.input, { width: 76 }]}
                      />
                      <Pressable
                        style={styles.iconBtn}
                        onPress={() =>
                          editGroup(g.key, {
                            options: g.options.filter((_, i) => i !== oi),
                            max: Math.max(1, Math.min(g.max, g.options.length - 1)),
                          })
                        }
                        accessibilityLabel={`Quitar ${o.name || `la opción ${oi + 1}`}`}>
                        <Ionicons name="close" size={20} color={Colors.textMuted} />
                      </Pressable>
                    </View>
                  );
                })}
                <Button title="Agregar opción" variant="ghost" onPress={() => editGroup(g.key, { options: [...g.options, { name: '', price: '' }] })} />
              </View>
            ))}
            {groups.length < MAX_GROUPS ? (
              <Text variant="caption">{groups.length ? 'Agregar otro grupo:' : 'Agrega un grupo:'}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(groups.length < MAX_GROUPS ? PRESETS : []).map((p) => (
                <Pressable
                  key={p.label}
                  style={styles.preset}
                  onPress={() => editGroups((list) => [...list, { ...p.group, options: p.group.options.map((o) => ({ ...o })), key: newKey() }])}>
                  <Ionicons name="add" size={16} color={Colors.orangeDeep} />
                  <Text variant="bodyStrong" style={{ fontSize: 14 }}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <FormError message={error} />
          <Button title={saving ? 'Guardando…' : id ? 'Guardar cambios' : 'Agregar al menú'} disabled={saving} onPress={save} />
          {id ? <Button title="Borrar plato" variant="ghost" onPress={remove} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.background },
  input: {
    minHeight: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: Colors.line, alignItems: 'center', justifyContent: 'center' },
  preset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.orange,
    backgroundColor: Colors.orangeSoft,
  },
});

export default function PlatoScreen() {
  return useRequireLogin() ? <Plato /> : null;
}
