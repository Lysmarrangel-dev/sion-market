import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { PinPicker } from '@/components/maps';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { CITY_CENTER } from '@/data/catalog';
import { inCoverage, useAddresses } from '@/store/addresses';

const ALIASES = ['Casa', 'Oficina', 'Otro'];

export default function NuevaDireccion() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { addresses, save } = useAddresses();
  const editing = addresses.find((a) => a.id === id);

  const [location, setLocation] = useState(editing?.location ?? CITY_CENTER);
  const [alias, setAlias] = useState(editing?.alias ?? 'Casa');
  const [street, setStreet] = useState(editing?.street ?? '');
  const [reference, setReference] = useState(editing?.reference ?? '');
  const [notifyMe, setNotifyMe] = useState(false);

  const covered = inCoverage(location);
  const valid = covered && street.trim().length > 3 && reference.trim().length > 5 && alias.trim().length > 0;

  const useMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({});
    setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.surface }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.map}>
        <PinPicker value={location} onChange={setLocation} />
        <View style={styles.mapTop}>
          <IconButton name="close" light onPress={() => router.back()} />
          <Pressable style={styles.locate} onPress={useMyLocation}>
            <Ionicons name="locate" size={18} color={Colors.black} />
            <Text variant="bodyStrong" style={{ fontSize: 14 }}>
              Mi ubicación
            </Text>
          </Pressable>
        </View>
        <View style={styles.hint}>
          <Text variant="caption" style={{ color: Colors.white }}>
            Arrastra el pin o toca el mapa
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: insets.bottom + 20 }} keyboardShouldPersistTaps="handled">
        {covered ? (
          <View style={[styles.banner, { backgroundColor: '#E8F6EE' }]}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
            <Text style={{ color: Colors.success, flex: 1 }}>Llegamos a esta dirección</Text>
          </View>
        ) : (
          <View style={[styles.banner, { backgroundColor: '#FDECEE', alignItems: 'flex-start' }]}>
            <Ionicons name="alert-circle" size={20} color={Colors.crimson} />
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: Colors.crimson }}>
                Todavía no llegamos a esta zona. Por ahora cubrimos el área urbana de San Felipe.
              </Text>
              <Pressable onPress={() => setNotifyMe(true)} disabled={notifyMe}>
                <Text variant="bodyStrong" style={{ color: Colors.crimson, textDecorationLine: notifyMe ? 'none' : 'underline' }}>
                  {notifyMe ? '✓ Te avisaremos cuando lleguemos a tu zona' : 'Avísame cuando lleguen a mi zona'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {ALIASES.map((a) => {
            const on = alias === a || (a === 'Otro' && !ALIASES.slice(0, 2).includes(alias));
            return (
              <Pressable key={a} onPress={() => setAlias(a === 'Otro' ? '' : a)} style={[styles.chip, on && styles.chipOn]}>
                <Text variant="bodyStrong" style={{ fontSize: 14, color: on ? Colors.white : Colors.text }}>
                  {a}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!ALIASES.slice(0, 2).includes(alias) ? (
          <Field label="Nombre de la dirección" value={alias} onChangeText={setAlias} placeholder="Ej. Casa de mamá" />
        ) : null}
        <Field label="Dirección" value={street} onChangeText={setStreet} placeholder="Calle, avenida, edificio o casa" />
        <Field
          label="Referencia (obligatoria)"
          value={reference}
          onChangeText={setReference}
          placeholder="Portón, color de la casa, piso…"
          multiline
        />
        <Button
          title={editing ? 'Guardar cambios' : 'Guardar dirección'}
          disabled={!valid}
          onPress={async () => {
            try {
              await save({ id: editing?.id, alias: alias.trim(), street: street.trim(), reference: reference.trim(), location });
              router.back();
            } catch (e) {
              Alert.alert('No pudimos guardar la dirección', e instanceof Error ? e.message : 'Revisa tu conexión e intenta de nuevo.');
            }
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="bodyStrong">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, props.multiline && { minHeight: 70, textAlignVertical: 'top', paddingTop: 12 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: 300 },
  mapTop: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  locate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
  },
  hint: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  banner: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: Radius.sm },
  chip: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  chipOn: { backgroundColor: Colors.black, borderColor: Colors.black },
  input: {
    minHeight: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
  },
});
