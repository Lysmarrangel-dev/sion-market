import Ionicons from '@expo/vector-icons/Ionicons';
import type { BusinessRequest, RequestStatus } from '@sionmarket/contracts';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';

import { Chips, FormError, formStyles } from '@/components/form';
import { PanelScreen } from '@/components/panel-screen';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { admin } from '@/lib/panel';

type Filter = RequestStatus | 'todas';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'nueva', label: 'Nuevas' },
  { id: 'contactada', label: 'Contactadas' },
  { id: 'afiliada', label: 'Afiliadas' },
  { id: 'descartada', label: 'Descartadas' },
  { id: 'todas', label: 'Todas' },
];
const STATUSES = FILTERS.filter((f): f is { id: RequestStatus; label: string } => f.id !== 'todas');

/** wa.me wants the number with country code and no symbols; the form stores Venezuelan numbers. */
const whatsapp = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.startsWith('58') ? digits : `58${digits.replace(/^0/, '')}`}`;
};

export default function AdminSolicitudes() {
  const [list, setList] = useState<BusinessRequest[] | null>(null);
  const [filter, setFilter] = useState<Filter>('nueva');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    admin
      .requests()
      .then(setList)
      .catch((e) => setError(e.message));
  }, []);
  useFocusEffect(load);

  const setStatus = async (r: BusinessRequest, status: RequestStatus) => {
    setList((l) => l?.map((x) => (x.id === r.id ? { ...x, status } : x)) ?? l);
    try {
      await admin.setRequestStatus(r.id, status);
    } catch (e) {
      setList((l) => l?.map((x) => (x.id === r.id ? r : x)) ?? l);
      setError((e as Error).message);
    }
  };

  const shown = (list ?? []).filter((r) => filter === 'todas' || r.status === filter);

  return (
    <PanelScreen title="Solicitudes de comercios" back>
      <Text variant="caption">Llegan del formulario «Registra tu comercio» de la página web.</Text>
      <Chips options={FILTERS} value={filter} onChange={setFilter} />
      <FormError message={error} />
      {!list ? <ActivityIndicator color={Colors.orange} /> : null}
      {list && !shown.length ? <Text variant="caption">No hay solicitudes aquí.</Text> : null}
      {shown.map((r) => (
        <View key={r.id} style={formStyles.card}>
          <View>
            <Text variant="heading">{r.businessName}</Text>
            <Text variant="caption">
              {[r.sector, r.contact, r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' }) : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {r.phone ? <Action icon="logo-whatsapp" label={r.phone} onPress={() => Linking.openURL(whatsapp(r.phone!))} /> : null}
            {r.email ? <Action icon="mail-outline" label={r.email} onPress={() => Linking.openURL(`mailto:${r.email}`)} /> : null}
            <Action icon="add-circle-outline" label="Crear su local" onPress={() => router.push({ pathname: '/panel/editar', params: { nombre: r.businessName, ...(r.email ? { correo: r.email } : {}) } })} />
          </View>
          <Chips options={STATUSES} value={r.status as RequestStatus} onChange={(s) => setStatus(r, s)} />
        </View>
      ))}
    </PanelScreen>
  );
}

function Action({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.action} onPress={onPress} accessibilityRole="link">
      <Ionicons name={icon} size={16} color={Colors.orangeDeep} />
      <Text variant="bodyStrong" style={{ fontSize: 14 }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.orangeSoft,
    maxWidth: '100%',
  },
});
