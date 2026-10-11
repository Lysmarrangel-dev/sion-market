import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { useOrders } from '@/store/orders';

// RF-C08 problem categories.
const REASONS = ['Pedido incompleto', 'Producto equivocado', 'Comida en mal estado', 'Entrega tardía', 'Conducta del repartidor', 'Otro'];

export default function Reportar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { get, report } = useOrders();
  const order = get(id);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  if (!order) return null;

  if (order.report) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <ScreenHeader title="Reportar un problema" />
        <View style={styles.done}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          <Text variant="title" style={{ textAlign: 'center' }}>
            Recibimos tu reporte
          </Text>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            «{order.report.reason}» en el pedido {order.code}. Soporte te escribirá pronto.
          </Text>
          <Button title="Listo" onPress={() => router.back()} style={{ alignSelf: 'stretch', marginTop: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader title="Reportar un problema" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <Text variant="caption">Pedido {order.code}. ¿Qué pasó?</Text>
        {REASONS.map((r) => {
          const on = reason === r;
          return (
            <Pressable key={r} style={[styles.option, on && styles.optionOn]} onPress={() => setReason(r)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {r}
              </Text>
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? Colors.black : Colors.textMuted} />
            </Pressable>
          );
        })}
        <TextInput
          value={detail}
          onChangeText={setDetail}
          placeholder="Describe el problema"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          multiline
          accessibilityLabel="Detalle del problema"
        />
        <Button title="Enviar reporte" disabled={!reason} onPress={() => reason && report(order.id, reason, detail.trim())} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.line },
  optionOn: { borderColor: Colors.orange, backgroundColor: Colors.orangeSoft },
  input: {
    minHeight: 90,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
    padding: 12,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
});
