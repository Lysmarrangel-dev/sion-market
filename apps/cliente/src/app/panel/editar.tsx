import type { Category, RestaurantInput } from '@sionmarket/contracts';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chips, Field, FormError, Row, formStyles } from '@/components/form';
import { PinPicker } from '@/components/maps';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { CITY_CENTER } from '@/data/catalog';
import { confirm } from '@/lib/confirm';
import { useRequireLogin } from '@/lib/auth-gate';
import { goBack } from '@/lib/nav';
import { centsText, panel, parseUsd } from '@/lib/panel';

const PRICE_LEVELS = [
  { id: '1', label: '$ Económico' },
  { id: '2', label: '$$ Medio' },
  { id: '3', label: '$$$ Alto' },
] as const;

type Form = {
  name: string;
  category: string;
  tags: string;
  etaMin: string;
  etaMax: string;
  delivery: string;
  minimum: string;
  priceLevel: '1' | '2' | '3';
  imageUrl: string;
  logoUrl: string;
  promo: string;
  address: string;
  schedule: string;
  location: { latitude: number; longitude: number };
};

const EMPTY: Form = {
  name: '',
  category: '',
  tags: '',
  etaMin: '25',
  etaMax: '40',
  delivery: '1.50',
  minimum: '0',
  priceLevel: '2',
  imageUrl: '',
  logoUrl: '',
  promo: '',
  address: '',
  schedule: 'Lun a Dom · 11:00 a 22:00',
  location: CITY_CENTER,
};

/** Form text → API body; a message when something is missing or wrong. */
function toInput(f: Form): RestaurantInput | string {
  const etaMin = parseInt(f.etaMin, 10);
  const etaMax = parseInt(f.etaMax, 10);
  const deliveryCents = parseUsd(f.delivery);
  const minimumCents = parseUsd(f.minimum || '0');
  const url = (u: string) => u.trim() || null;
  if (f.name.trim().length < 2) return 'Escribe el nombre del restaurante.';
  if (!f.category) return 'Elige una categoría.';
  if (!(etaMin >= 5) || !(etaMax >= etaMin)) return 'Revisa el tiempo de entrega: el máximo debe ser mayor o igual al mínimo.';
  if (deliveryCents === null || minimumCents === null) return 'Revisa el costo de envío y el pedido mínimo.';
  if (f.address.trim().length < 5) return 'Escribe la dirección del local.';
  for (const u of [f.imageUrl, f.logoUrl]) if (u.trim() && !/^https?:\/\/\S+$/.test(u.trim())) return 'Las fotos deben ser enlaces que empiecen con https://';
  return {
    name: f.name.trim(),
    category: f.category,
    tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 6),
    etaMin,
    etaMax,
    deliveryCents,
    minimumCents,
    priceLevel: Number(f.priceLevel),
    imageUrl: url(f.imageUrl),
    logoUrl: url(f.logoUrl),
    promo: f.promo.trim() || null,
    address: f.address.trim(),
    schedule: f.schedule.trim(),
    location: f.location,
  };
}

function EditarRestaurante() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [form, setForm] = useState<Form | null>(id ? null : EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    panel.categories().then(setCategories).catch(() => {});
    if (!id) return;
    panel
      .detail(id)
      .then((r) =>
        setForm({
          name: r.name,
          category: r.category,
          tags: r.tags.join(', '),
          etaMin: String(r.etaMin),
          etaMax: String(r.etaMax),
          delivery: centsText(r.deliveryCents),
          minimum: centsText(r.minimumCents),
          priceLevel: String(r.priceLevel) as Form['priceLevel'],
          imageUrl: r.imageUrl ?? '',
          logoUrl: r.logoUrl ?? '',
          promo: r.promo ?? '',
          address: r.address,
          schedule: r.schedule,
          location: r.location,
        }),
      )
      .catch((e) => setError(e.message));
  }, [id]);

  if (!form) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <ScreenHeader title="Editar restaurante" />
        {error ? <FormError message={error} /> : <ActivityIndicator color={Colors.orange} style={{ marginTop: 40 }} />}
      </SafeAreaView>
    );
  }

  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const save = async () => {
    const input = toInput(form);
    if (typeof input === 'string') return setError(input);
    setError(null);
    setSaving(true);
    try {
      const saved = id ? await panel.update(id, input) : await panel.create(input);
      if (id) goBack();
      else router.replace({ pathname: '/panel/local', params: { id: saved.id } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id || !(await confirm('Borrar restaurante', `¿Seguro que quieres borrar ${form.name} y su menú?`, 'Borrar'))) return;
    try {
      await panel.remove(id);
      router.dismissTo('/panel');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader title={id ? 'Editar restaurante' : 'Nuevo restaurante'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={formStyles.card}>
            <Text variant="label">El local</Text>
            <Field label="Nombre" value={form.name} onChangeText={set('name')} placeholder="Arepera Doña Inés" />
            <View style={{ gap: 6 }}>
              <Text variant="bodyStrong">Categoría</Text>
              <Chips options={categories.map((c) => ({ id: c.id, label: c.name }))} value={form.category} onChange={set('category')} />
            </View>
            <Field label="Etiquetas" value={form.tags} onChangeText={set('tags')} placeholder="Arepas, Desayunos" hint="Separadas por comas, hasta 6." />
            <View style={{ gap: 6 }}>
              <Text variant="bodyStrong">Precios</Text>
              <Chips options={[...PRICE_LEVELS]} value={form.priceLevel} onChange={set('priceLevel')} />
            </View>
            <Field label="Horario" value={form.schedule} onChangeText={set('schedule')} />
            <Field label="Promoción (opcional)" value={form.promo} onChangeText={set('promo')} placeholder="Envío gratis los martes" />
          </View>

          <View style={formStyles.card}>
            <Text variant="label">Entrega</Text>
            <Row>
              <Field label="Tiempo mínimo (min)" value={form.etaMin} onChangeText={set('etaMin')} keyboardType="number-pad" />
              <Field label="Tiempo máximo (min)" value={form.etaMax} onChangeText={set('etaMax')} keyboardType="number-pad" />
            </Row>
            <Row>
              <Field label="Envío (USD)" value={form.delivery} onChangeText={set('delivery')} keyboardType="decimal-pad" />
              <Field label="Pedido mínimo (USD)" value={form.minimum} onChangeText={set('minimum')} keyboardType="decimal-pad" />
            </Row>
          </View>

          <View style={formStyles.card}>
            <Text variant="label">Ubicación</Text>
            <Field label="Dirección" value={form.address} onChangeText={set('address')} placeholder="Av. La Patria, frente a la plaza" />
            <Text variant="caption">Mueve el pin hasta la puerta del local: de ahí sale el repartidor.</Text>
            <View style={{ height: 260, borderRadius: Radius.md, overflow: 'hidden' }}>
              <PinPicker value={form.location} onChange={set('location')} />
            </View>
          </View>

          <View style={formStyles.card}>
            <Text variant="label">Fotos</Text>
            <Field label="Foto de portada (enlace)" value={form.imageUrl} onChangeText={set('imageUrl')} placeholder="https://…" autoCapitalize="none" keyboardType="url" />
            <Field label="Logo (enlace)" value={form.logoUrl} onChangeText={set('logoUrl')} placeholder="https://…" autoCapitalize="none" keyboardType="url" />
          </View>

          <FormError message={error} />
          <Button title={saving ? 'Guardando…' : id ? 'Guardar cambios' : 'Registrar restaurante'} disabled={saving} onPress={save} />
          {id ? <Button title="Borrar restaurante" variant="ghost" onPress={remove} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function EditarRestauranteScreen() {
  return useRequireLogin() ? <EditarRestaurante /> : null;
}
