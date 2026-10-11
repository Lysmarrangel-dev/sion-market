import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { Stars } from '@/components/stars';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { getRestaurant, RIDER } from '@/data/catalog';
import { useOrders } from '@/store/orders';

// RF-C08: separate ratings for the food (restaurant) and the delivery (rider).
export default function Calificar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { get, rate } = useOrders();
  const order = get(id);
  const [food, setFood] = useState(0);
  const [foodComment, setFoodComment] = useState('');
  const [delivery, setDelivery] = useState(0);
  const [deliveryComment, setDeliveryComment] = useState('');
  if (!order) return null;
  const restaurant = getRestaurant(order.restaurantId)!;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader title="Califica tu pedido" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Image source={restaurant.logo} style={styles.avatar} />
          <Text variant="heading">¿Qué tal la comida de {restaurant.name}?</Text>
          <Stars value={food} onChange={setFood} label="Calificación de la comida" />
          <TextInput
            value={foodComment}
            onChangeText={setFoodComment}
            placeholder="Cuéntanos más (opcional)"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            multiline
            accessibilityLabel="Comentario sobre la comida"
          />
        </View>
        <View style={styles.card}>
          <Image source={RIDER.photo} style={styles.avatar} />
          <Text variant="heading">¿Cómo fue la entrega de {RIDER.name.split(' ')[0]}?</Text>
          <Stars value={delivery} onChange={setDelivery} label="Calificación de la entrega" />
          <TextInput
            value={deliveryComment}
            onChangeText={setDeliveryComment}
            placeholder="Cuéntanos más (opcional)"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            multiline
            accessibilityLabel="Comentario sobre la entrega"
          />
        </View>
        <Button
          title="Enviar calificación"
          disabled={!food || !delivery}
          onPress={() => {
            rate(order.id, { food, foodComment, delivery, deliveryComment });
            router.back();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 12, padding: 18, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  input: {
    alignSelf: 'stretch',
    minHeight: 64,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.background,
    padding: 12,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
    textAlignVertical: 'top',
  },
});
