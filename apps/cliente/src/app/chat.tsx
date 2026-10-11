import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chat } from '@/components/chat';
import { ScreenHeader } from '@/components/screen-header';
import { Colors } from '@/constants/theme';
import { RIDER } from '@/data/catalog';
import { useOrders } from '@/store/orders';

const REPLIES = ['¡Listo! Ya voy en camino 🛵', 'Perfecto, toco el timbre al llegar.', 'Recibido, gracias.', 'Estoy a unas cuadras.'];
// RF-C07 predefined quick replies.
const QUICK = ['Estoy en la entrada', 'Toca el timbre', 'Déjalo en la puerta', 'Ya voy bajando'];
const CHAT_WINDOW_MS = 30 * 60 * 1000;

export default function RiderChat() {
  const { pedido } = useLocalSearchParams<{ pedido?: string }>();
  const { get } = useOrders();
  const order = pedido ? get(pedido) : undefined;
  const deliveredAt = order?.history.find((h) => h.status === 'ENTREGADO')?.at;
  // Chat stays open until 30 minutes after delivery.
  // eslint-disable-next-line react-hooks/purity
  const closed = deliveredAt != null && Date.now() - deliveredAt > CHAT_WINDOW_MS;
  let i = 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'bottom']}>
      <ScreenHeader
        title={`${RIDER.name.split(' ')[0]} · Repartidor`}
        right={
          <Pressable onPress={() => Linking.openURL(`tel:${RIDER.maskedPhone}`)} accessibilityLabel="Llamar (número enmascarado)" hitSlop={8}>
            <Ionicons name="call" size={24} color={Colors.orangeDeep} />
          </Pressable>
        }
      />
      <Chat
        initial={[{ id: '0', from: 'them', text: 'Hola, ya tengo tu pedido. ¿Alguna indicación para llegar?' }]}
        reply={() => REPLIES[i++ % REPLIES.length]}
        placeholder="Escribe un mensaje"
        suggestions={QUICK}
        receipts
        disabled={closed ? 'Este chat se cerró 30 minutos después de la entrega. Si necesitas ayuda, reporta un problema.' : undefined}
        attachments={{
          onLocation: async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return null;
            const pos = await Location.getCurrentPositionAsync({});
            return `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          },
          onPhoto: async () => {
            const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
            return res.canceled ? null : res.assets[0].uri;
          },
        }}
      />
    </SafeAreaView>
  );
}
