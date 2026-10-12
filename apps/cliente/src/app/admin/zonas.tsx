import Ionicons from '@expo/vector-icons/Ionicons';
import type { AdminZone } from '@sionmarket/contracts';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Badge } from '@/components/badge';
import { FormError, Toggle, formStyles } from '@/components/form';
import { PanelScreen } from '@/components/panel-screen';
import { Text } from '@/components/text';
import { Colors } from '@/constants/theme';
import { confirm } from '@/lib/confirm';
import { admin } from '@/lib/panel';

export default function AdminZonas() {
  const [zones, setZones] = useState<AdminZone[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    admin
      .zones()
      .then(setZones)
      .catch((e) => setError(e.message));
  }, []);
  useFocusEffect(load);

  const toggle = async (z: AdminZone, active: boolean) => {
    if (!active && !(await confirm('Desactivar zona', `Nadie podrá guardar direcciones nuevas en ${z.name}.`, 'Desactivar'))) return;
    setZones((l) => l?.map((x) => (x.id === z.id ? { ...x, active } : x)) ?? l);
    try {
      await admin.setZoneActive(z.id, active);
    } catch (e) {
      setZones((l) => l?.map((x) => (x.id === z.id ? { ...x, active: !active } : x)) ?? l);
      setError((e as Error).message);
    }
  };

  return (
    <PanelScreen title="Zonas" subtitle={zones ? `${zones.filter((z) => z.active).length} activas de ${zones.length}` : 'Cobertura'}>
      <FormError message={error} />
      {!zones ? <ActivityIndicator color={Colors.orange} /> : null}
      {zones?.map((z) => (
        <View key={z.id} style={formStyles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="map" size={20} color={Colors.orangeDeep} />
            <Text variant="heading" style={{ flex: 1 }}>
              {z.name}
            </Text>
            <Badge on={z.active} yes="Activa" no="Inactiva" />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Count value={z.restaurants} label="restaurantes" />
            <Count value={z.addresses} label="direcciones" />
            <Count value={z.orders30d} label="pedidos en 30 días" />
          </View>
          <Toggle
            label="Recibe pedidos"
            detail={z.active ? 'Los clientes de esta zona pueden guardar su dirección y pedir.' : 'Los clientes ven que todavía no llegamos aquí.'}
            value={z.active}
            onChange={(v) => toggle(z, v)}
          />
        </View>
      ))}
    </PanelScreen>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="title">{value}</Text>
      <Text variant="caption">{label}</Text>
    </View>
  );
}
