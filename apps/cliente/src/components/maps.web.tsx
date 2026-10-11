import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { BRAND_ANGLE, Colors } from '@/constants/theme';
import { COVERAGE_ZONE, type LatLng } from '@/data/catalog';

// Web has no native map: a schematic of the coverage area so screens still work in the browser.
const lats = COVERAGE_ZONE.map((p) => p.latitude);
const lngs = COVERAGE_ZONE.map((p) => p.longitude);
const box = { minLat: Math.min(...lats) - 0.01, maxLat: Math.max(...lats) + 0.01, minLng: Math.min(...lngs) - 0.01, maxLng: Math.max(...lngs) + 0.01 };
const toPct = (p: LatLng) => ({
  left: `${((p.longitude - box.minLng) / (box.maxLng - box.minLng)) * 100}%` as const,
  top: `${((box.maxLat - p.latitude) / (box.maxLat - box.minLat)) * 100}%` as const,
});

function Streets() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.street, { left: `${i * 24}%`, top: -40, bottom: -40, width: 12, transform: [{ rotate: BRAND_ANGLE }] }]} />
      ))}
      {[0, 1, 2].map((i) => (
        <View key={`h${i}`} style={[styles.street, { top: `${20 + i * 30}%`, left: -20, right: -20, height: 10 }]} />
      ))}
    </>
  );
}

function Dot({ at, color, icon }: { at: LatLng; color: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.pin, toPct(at), { backgroundColor: color }]}>
      <Ionicons name={icon} size={16} color={color === Colors.orange ? Colors.black : Colors.white} />
    </View>
  );
}

export function PinPicker({ value, onChange, style }: { value: LatLng; onChange: (p: LatLng) => void; style?: ViewStyle }) {
  return (
    <Pressable
      style={[StyleSheet.absoluteFill, styles.map, style]}
      onPress={(e) => {
        const { locationX, locationY } = e.nativeEvent;
        const target = e.currentTarget as unknown as { clientWidth: number; clientHeight: number };
        onChange({
          latitude: box.maxLat - (locationY / target.clientHeight) * (box.maxLat - box.minLat),
          longitude: box.minLng + (locationX / target.clientWidth) * (box.maxLng - box.minLng),
        });
      }}>
      <Streets />
      <Dot at={value} color={Colors.orange} icon="home" />
    </Pressable>
  );
}

export function TrackingMap({ restaurant, customer, rider, style }: { restaurant: LatLng; customer: LatLng; rider: LatLng | null; style?: ViewStyle }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.map, style]}>
      <Streets />
      <Dot at={restaurant} color={Colors.crimson} icon="restaurant" />
      <Dot at={customer} color={Colors.black} icon="home" />
      {rider ? <Dot at={rider} color={Colors.orange} icon="bicycle" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { backgroundColor: '#EFE9E1', overflow: 'hidden' },
  street: { position: 'absolute', backgroundColor: Colors.white },
  pin: {
    position: 'absolute',
    marginLeft: -18,
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
});
