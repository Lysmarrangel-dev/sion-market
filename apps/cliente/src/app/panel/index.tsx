import Ionicons from '@expo/vector-icons/Ionicons';
import type { RestaurantSummary } from '@sionmarket/contracts';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { ApiRequestError, online } from '@/lib/api';
import { useRequireLogin } from '@/lib/auth-gate';
import { goBack } from '@/lib/nav';
import { panel } from '@/lib/panel';

type State = { kind: 'loading' } | { kind: 'ready'; list: RestaurantSummary[] } | { kind: 'denied' } | { kind: 'error'; message: string };

function Panel() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useFocusEffect(
    useCallback(() => {
      if (!online) return setState({ kind: 'error', message: 'El panel necesita conexión con el servidor de SionMarket.' });
      panel
        .mine()
        .then((list) => setState({ kind: 'ready', list }))
        .catch((e) =>
          setState(e instanceof ApiRequestError && e.status === 403 ? { kind: 'denied' } : { kind: 'error', message: e.message }),
        );
    }, []),
  );

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        <View style={styles.header}>
          <IconButton name="arrow-back" onPress={goBack} />
          <View style={{ flex: 1 }}>
            <Text variant="display">Mis restaurantes</Text>
            <Text variant="caption">Tu local, tu menú y los pedidos que llegan.</Text>
          </View>
        </View>

        {state.kind === 'loading' ? <ActivityIndicator color={Colors.orange} style={{ marginTop: 40 }} /> : null}

        {state.kind === 'denied' ? (
          <View style={styles.note}>
            <Ionicons name="lock-closed-outline" size={28} color={Colors.orangeDeep} />
            <Text variant="heading">Tu cuenta todavía no es de restaurante</Text>
            <Text variant="caption" style={{ textAlign: 'center' }}>
              Pide a SionMarket que active el acceso de restaurante para el correo con el que entraste.
            </Text>
          </View>
        ) : null}

        {state.kind === 'error' ? (
          <View style={styles.note}>
            <Text style={{ color: Colors.danger, textAlign: 'center' }}>{state.message}</Text>
          </View>
        ) : null}

        {state.kind === 'ready' ? (
          <>
            <Button title="Registrar un restaurante" onPress={() => router.push('/panel/editar')} />
            {state.list.length === 0 ? (
              <Text variant="caption" style={{ textAlign: 'center' }}>
                Aún no tienes restaurantes. Registra el primero para que aparezca en la app.
              </Text>
            ) : null}
            {state.list.map((r) => (
              <Pressable key={r.id} style={styles.card} onPress={() => router.push({ pathname: '/panel/local', params: { id: r.id } })}>
                {r.logoUrl || r.imageUrl ? (
                  <Image source={r.logoUrl ?? r.imageUrl} style={styles.logo} contentFit="cover" />
                ) : (
                  <View style={[styles.logo, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="restaurant" size={22} color={Colors.orangeDeep} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="heading" numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text variant="caption" numberOfLines={1}>
                    {r.tags.join(' · ') || r.category}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: r.open ? Colors.successSoft : Colors.dangerSoft }]}>
                  <Text variant="caption" style={{ color: r.open ? Colors.success : Colors.danger }}>
                    {r.open ? 'Abierto' : 'Cerrado'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { alignItems: 'center', gap: 10, padding: 24, backgroundColor: Colors.surface, borderRadius: Radius.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  logo: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.background },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill },
});

export default function PanelScreen() {
  return useRequireLogin() ? <Panel /> : null;
}
