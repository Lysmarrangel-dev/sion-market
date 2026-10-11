import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { inCoverage, useAddresses } from '@/store/addresses';

const aliasIcon = (alias: string) =>
  alias.toLowerCase().includes('casa') ? 'home' : alias.toLowerCase().includes('oficina') ? 'briefcase' : 'location';

// RF-C02: saved addresses with alias. Opened with ?elegir=1 from checkout to pick one.
export default function Direcciones() {
  const { elegir } = useLocalSearchParams<{ elegir?: string }>();
  const { addresses, selected, select, remove } = useAddresses();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader title={elegir ? 'Entregar en' : 'Mis direcciones'} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {addresses.map((a) => {
          const on = selected?.id === a.id;
          const covered = inCoverage(a.location);
          return (
            <Pressable
              key={a.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (!covered) return;
                select(a.id);
                if (elegir) router.back();
              }}
              style={[styles.card, on && styles.cardOn, !covered && { opacity: 0.6 }]}>
              <Ionicons name={aliasIcon(a.alias)} size={22} color={on ? Colors.black : Colors.orangeDeep} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="bodyStrong">{a.alias}</Text>
                <Text variant="caption">{a.street}</Text>
                <Text variant="caption" numberOfLines={1}>
                  Ref.: {a.reference}
                </Text>
                {!covered ? (
                  <Text variant="caption" style={{ color: Colors.crimson }}>
                    Fuera de la zona de cobertura
                  </Text>
                ) : null}
              </View>
              <View style={{ gap: 14, alignItems: 'center' }}>
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={Colors.text}
                  accessibilityLabel={`Editar ${a.alias}`}
                  onPress={() => router.push({ pathname: '/direcciones/nueva', params: { id: a.id } })}
                />
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={Colors.crimson}
                  accessibilityLabel={`Borrar ${a.alias}`}
                  onPress={() =>
                    Alert.alert('Borrar dirección', `¿Borrar «${a.alias}»?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Borrar', style: 'destructive', onPress: () => void remove(a.id).catch(() => {}) },
                    ])
                  }
                />
              </View>
            </Pressable>
          );
        })}
        <Button title="Agregar dirección" variant="outline" onPress={() => router.push('/direcciones/nueva')} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.line,
  },
  cardOn: { borderColor: Colors.orange, backgroundColor: Colors.orangeSoft },
});
