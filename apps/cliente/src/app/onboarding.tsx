import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AngleStripes } from '@/components/angle-stripes';
import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { Text } from '@/components/text';
import { BrandGradient, Colors } from '@/constants/theme';

const SLIDES = [
  {
    icon: 'restaurant' as const,
    title: 'Lo mejor de San Felipe, en tu puerta',
    body: 'Pide a tus restaurantes favoritos y recibe en minutos.',
  },
  {
    icon: 'cash' as const,
    title: 'Paga como quieras',
    body: 'Pago Móvil, transferencia, tarjeta o efectivo. Precios en dólares y bolívares.',
  },
  {
    icon: 'bicycle' as const,
    title: 'Sigue tu pedido en vivo',
    body: 'Ve a tu repartidor en el mapa y chatea con él hasta que llegue.',
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const list = useRef<FlatList>(null);
  const last = index === SLIDES.length - 1;

  const next = () => {
    if (last) return router.replace('/login');
    list.current?.scrollToIndex({ index: index + 1 });
  };

  return (
    <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <AngleStripes />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <Logo kind="blanco" height={44} />
          {!last ? (
            <Text style={styles.skip} onPress={() => router.replace('/login')}>
              Saltar
            </Text>
          ) : null}
        </View>

        <FlatList
          ref={list}
          style={{ flex: 1 }}
          data={SLIDES}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(s) => s.title}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon} size={64} color={Colors.black} />
              </View>
              <Text variant="display" style={styles.title}>
                {item.title}
              </Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          )}
        />

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
          <Button title={last ? 'Empezar' : 'Siguiente'} variant="dark" onPress={next} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 8 },
  skip: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  slide: { height: '100%', paddingHorizontal: 28, justifyContent: 'center' },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 36,
    transform: [{ rotate: '-16deg' }],
  },
  title: { color: Colors.white, fontSize: 32, lineHeight: 38 },
  body: { color: 'rgba(255,255,255,0.92)', fontSize: 17, lineHeight: 24, marginTop: 12 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, gap: 24 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { width: 28, backgroundColor: Colors.white },
});
