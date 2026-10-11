import type { RestaurantDetail } from '@sionmarket/contracts';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chips, Field, FormError, Toggle, formStyles } from '@/components/form';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { Colors } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { useRequireLogin } from '@/lib/auth-gate';
import { goBack } from '@/lib/nav';
import { centsText, panel, parseUsd } from '@/lib/panel';

type Form = { section: string; name: string; description: string; price: string; imageUrl: string; popular: boolean; soldOut: boolean };

const EMPTY: Form = { section: '', name: '', description: '', price: '', imageUrl: '', popular: false, soldOut: false };

function Plato() {
  const { restaurante, id } = useLocalSearchParams<{ restaurante: string; id?: string }>();
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [form, setForm] = useState<Form | null>(id ? null : EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const save = async () => {
    const priceCents = parseUsd(form.price);
    if (!form.section.trim()) return setError('Escribe o elige la sección del menú (por ejemplo, Bebidas).');
    if (form.name.trim().length < 2) return setError('Escribe el nombre del plato.');
    if (!priceCents) return setError('Escribe el precio en dólares, por ejemplo 3.50.');
    if (form.imageUrl.trim() && !/^https?:\/\/\S+$/.test(form.imageUrl.trim())) return setError('La foto debe ser un enlace que empiece con https://');
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
      if (id) await panel.updateProduct(restaurante, id, input);
      else await panel.addProduct(restaurante, input);
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
          <Text variant="caption">Las opciones como tamaños o adicionales se agregarán más adelante.</Text>
          <FormError message={error} />
          <Button title={saving ? 'Guardando…' : id ? 'Guardar cambios' : 'Agregar al menú'} disabled={saving} onPress={save} />
          {id ? <Button title="Borrar plato" variant="ghost" onPress={remove} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function PlatoScreen() {
  return useRequireLogin() ? <Plato /> : null;
}
