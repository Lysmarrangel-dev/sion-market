import Ionicons from '@expo/vector-icons/Ionicons';
import type { RestaurantDetail } from '@sionmarket/contracts';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { useLayout } from '@/lib/layout';
import { useMode } from '@/lib/mode';
import { panel } from '@/lib/panel';
import { negocio, useNegocio } from '@/store/negocio';

/**
 * Wraps every business panel screen: waits for the restaurant, explains what to do when the
 * account has none, and hands the loaded restaurant to the screen.
 */
export function NegocioScreen({ children, wide }: { children: (r: RestaurantDetail) => React.ReactNode; wide?: boolean }) {
  const { status, restaurant, error } = useNegocio();
  const { modes, setMode } = useMode();
  const { gutter } = useLayout();

  let body: React.ReactNode;
  if (status === 'loading' || status === 'idle') body = <ActivityIndicator color={Colors.orange} style={{ marginTop: 60 }} />;
  else if (status === 'denied' || (status === 'ready' && !restaurant) || (status === 'error' && !restaurant)) {
    const denied = status === 'denied';
    body = (
      <View style={styles.note}>
        <Ionicons name={denied ? 'lock-closed-outline' : 'storefront-outline'} size={32} color={Colors.orangeDeep} />
        <Text variant="title" style={{ textAlign: 'center' }}>
          {denied ? 'Tu cuenta todavía no es de restaurante' : status === 'error' ? 'No pudimos cargar tu local' : 'Registra tu restaurante'}
        </Text>
        <Text variant="caption" style={{ textAlign: 'center' }}>
          {denied
            ? 'Pide a SionMarket que active el acceso de restaurante para el correo con el que entraste.'
            : status === 'error'
              ? error
              : 'Carga los datos de tu local y tu menú para empezar a recibir pedidos.'}
        </Text>
        {status === 'error' ? <Button title="Reintentar" onPress={negocio.reload} /> : null}
        {!denied && status !== 'error' ? <Button title="Registrar mi restaurante" onPress={() => router.push('/panel/editar')} /> : null}
        {modes.includes('cliente') ? <Button title="Ir al modo cliente" variant="ghost" onPress={() => setMode('cliente')} /> : null}
      </View>
    );
  } else body = children(restaurant!);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ padding: gutter, gap: 16, paddingBottom: 48 }}>
        <View style={[{ gap: 16, width: '100%', alignSelf: 'center' }, wide && { maxWidth: 1040 }]}>{body}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Restaurant name, its picker when the owner has several, and the open/closed switch. */
export function NegocioHeader({ restaurant, title }: { restaurant: RestaurantDetail; title: string }) {
  const { list } = useNegocio();

  const toggleOpen = async (open: boolean) => {
    negocio.patch((r) => ({ ...r, open }));
    try {
      await panel.setOpen(restaurant.id, open);
    } catch {
      negocio.patch((r) => ({ ...r, open: !open }));
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <View>
        <Text variant="caption">{restaurant.name}</Text>
        <Text variant="display">{title}</Text>
      </View>
      {list.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {list.map((r) => {
            const on = r.id === restaurant.id;
            return (
              <Pressable key={r.id} style={[styles.pick, on && styles.pickOn]} onPress={() => negocio.select(r.id)}>
                <Text variant="bodyStrong" style={{ fontSize: 14, color: on ? Colors.inkInverse : Colors.text }}>
                  {r.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      {!restaurant.enabled ? (
        <View style={[styles.bar, { backgroundColor: Colors.dangerSoft }]}>
          <Ionicons name="pause-circle" size={22} color={Colors.danger} />
          <Text style={{ flex: 1, color: Colors.danger }}>
            SionMarket pausó este local: los clientes no lo ven. Escríbenos para reactivarlo.
          </Text>
        </View>
      ) : (
        <View style={[styles.bar, { backgroundColor: restaurant.open ? Colors.successSoft : Colors.dangerSoft }]}>
          <View style={{ flex: 1 }}>
            <Text variant="heading" style={{ color: restaurant.open ? Colors.success : Colors.danger }}>
              {restaurant.open ? 'Abierto: recibiendo pedidos' : 'Cerrado: no recibe pedidos'}
            </Text>
            <Text variant="caption">{restaurant.schedule}</Text>
          </View>
          <Switch
            value={restaurant.open}
            onValueChange={toggleOpen}
            accessibilityLabel="Abierto"
            trackColor={{ true: Colors.success, false: Colors.line }}
            thumbColor={Colors.white}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  note: { alignItems: 'center', gap: 12, padding: 28, backgroundColor: Colors.surface, borderRadius: Radius.md, marginTop: 24 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.md },
  pick: { paddingHorizontal: 14, height: 36, borderRadius: Radius.pill, justifyContent: 'center', borderWidth: 1, borderColor: Colors.line, backgroundColor: Colors.surface },
  pickOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
});
