import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chat } from '@/components/chat';
import { Logo } from '@/components/logo';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { Colors } from '@/constants/theme';
import { RESTAURANTS } from '@/data/catalog';

// Canned answers for the demo; the real assistant will call the AI backend.
function answer(text: string) {
  const t = text.toLowerCase();
  if (t.includes('barat') || t.includes('econ')) {
    return 'Lo más económico ahora: Clásica de la casa en La Parrilla Yaracuy por $5,00, y Papas rústicas por $2,50.';
  }
  if (t.includes('pizza')) return 'Pizzería Don Nicola tiene 2x1 los jueves. La margarita cuesta $8,00 y llega en 30-45 min.';
  if (t.includes('rápid') || t.includes('rapid')) {
    const fast = [...RESTAURANTS].filter((r) => r.open).sort((a, b) => a.etaMin - b.etaMin)[0];
    return `${fast.name} es lo más rápido ahora: ${fast.etaMin}-${fast.etaMax} min.`;
  }
  if (t.includes('pedido')) return 'Tu último pedido fue en La Parrilla Yaracuy. ¿Quieres repetirlo?';
  return 'Puedo recomendarte restaurantes, buscar platos o ayudarte con tu pedido. Prueba con “algo rápido” o “pizza”.';
}

export default function Asistente() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'bottom']}>
      <ScreenHeader title="Sion IA" />
      <Chat
        header={
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 16 }}>
            <Logo kind="isotipo" height={64} />
            <Text variant="heading">Tu asistente de antojos</Text>
            <Text variant="caption" style={{ textAlign: 'center' }}>
              Pregúntame qué comer, cuánto cuesta o dónde está tu pedido.
            </Text>
          </View>
        }
        initial={[{ id: '0', from: 'them', text: '¡Hola, Albieri! ¿Qué se te antoja hoy?' }]}
        reply={answer}
        placeholder="Pregúntale a Sion IA"
        suggestions={['Algo rápido', 'Pizza', 'Lo más barato']}
      />
    </SafeAreaView>
  );
}
