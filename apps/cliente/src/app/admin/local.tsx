import Ionicons from '@expo/vector-icons/Ionicons';
import type { AdminRestaurant } from '@sionmarket/contracts';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Field, FormError, Toggle, formStyles } from '@/components/form';
import { MenuList, Row } from '@/components/menu-row';
import { PanelScreen } from '@/components/panel-screen';
import { Text } from '@/components/text';
import { Colors } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { useMode } from '@/lib/mode';
import { admin } from '@/lib/panel';
import { negocio } from '@/store/negocio';

export default function AdminLocal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { setMode } = useMode();
  const [r, setR] = useState<AdminRestaurant | null>(null);
  const [owner, setOwner] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    admin
      .restaurants()
      .then((list) => {
        const found = list.find((x) => x.id === id) ?? null;
        setR(found);
        setOwner(found?.ownerEmail ?? '');
        if (!found) setError('Ese local ya no existe.');
      })
      .catch((e) => setError(e.message));
  }, [id]);
  useFocusEffect(load);

  if (!r) {
    return (
      <PanelScreen title="Local" back>
        {error ? <FormError message={error} /> : <ActivityIndicator color={Colors.orange} />}
      </PanelScreen>
    );
  }

  const setEnabled = async (enabled: boolean) => {
    if (!enabled && !(await confirm('Pausar restaurante', `${r.name} dejará de verse en la app y no recibirá pedidos.`, 'Pausar'))) return;
    setR({ ...r, enabled });
    try {
      await admin.setEnabled(r.id, enabled);
    } catch (e) {
      setR({ ...r, enabled: !enabled });
      setError((e as Error).message);
    }
  };

  const saveOwner = async () => {
    const email = owner.trim().toLowerCase() || null;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await admin.setOwner(r.id, email);
      setNotice(email ? `Listo: ${email} ya puede entrar al panel de ${r.name}.` : 'El local quedó sin dueño.');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Open this restaurant's own panel, as its owner sees it.
  const openPanel = async () => {
    await negocio.select(r.id);
    setMode('restaurante');
  };

  return (
    <PanelScreen title={r.name} subtitle={`${r.zone ?? 'Fuera de zona'} · ${r.orders30d} pedidos en 30 días`} back>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Badge on={r.enabled} yes="Activo" no="Pausado" />
        <Badge on={r.open} yes="Abierto" no="Cerrado" soft />
      </View>
      <View style={formStyles.card}>
        <Toggle
          label="Activo en SionMarket"
          detail={r.enabled ? 'Los clientes lo ven y puede recibir pedidos.' : 'Pausado: no aparece en la app y no recibe pedidos.'}
          value={r.enabled}
          onChange={setEnabled}
        />
        <Text variant="caption">El horario y si está abierto ahora lo decide cada restaurante desde su panel.</Text>
      </View>
      <View style={formStyles.card}>
        <Text variant="caption">{r.owner ? `Dueño actual: ${r.owner}` : 'Este local no tiene dueño todavía.'}</Text>
        <Field
          label="Correo del dueño"
          hint="La cuenta tiene que estar registrada en SionMarket. Recibe el acceso de restaurante al guardar."
          value={owner}
          onChangeText={setOwner}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="dueno@correo.com"
        />
        {notice ? <Text style={{ color: Colors.success }}>{notice}</Text> : null}
        <FormError message={error} />
        <Button title={saving ? 'Guardando…' : 'Guardar dueño'} disabled={saving || owner.trim() === (r.ownerEmail ?? '')} onPress={saveOwner} />
      </View>
      <MenuList>
        <Row icon="speedometer-outline" label="Abrir el panel del local" detail="pedidos y menú" onPress={openPanel} />
        <Row icon="create-outline" label="Editar datos del local" onPress={() => router.push({ pathname: '/panel/editar', params: { id: r.id } })} />
        <Row icon="receipt-outline" label="Ver sus pedidos en curso" onPress={() => router.navigate({ pathname: '/admin/pedidos', params: { restaurante: r.id, nombre: r.name } })} />
      </MenuList>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
        <Text variant="caption">En SionMarket desde {new Date(r.createdAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
      </View>
    </PanelScreen>
  );
}
