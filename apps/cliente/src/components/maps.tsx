import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import MapView, { Marker, Polygon, Polyline } from 'react-native-maps';

import { Colors } from '@/constants/theme';
import { COVERAGE_ZONE, type LatLng } from '@/data/catalog';

const delta = { latitudeDelta: 0.012, longitudeDelta: 0.012 };

// Draggable pin for choosing a delivery address (RF-C02).
export function PinPicker({ value, onChange, style }: { value: LatLng; onChange: (p: LatLng) => void; style?: ViewStyle }) {
  const map = useRef<MapView>(null);
  useEffect(() => {
    map.current?.animateToRegion({ ...value, ...delta }, 300);
  }, [value]);
  return (
    <MapView
      ref={map}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={{ ...value, ...delta }}
      onPress={(e) => onChange(e.nativeEvent.coordinate)}
      showsUserLocation>
      <Polygon coordinates={COVERAGE_ZONE} strokeColor={Colors.orange} fillColor="rgba(251,99,1,0.08)" strokeWidth={2} />
      <Marker coordinate={value} draggable onDragEnd={(e) => onChange(e.nativeEvent.coordinate)}>
        <View style={styles.pin}>
          <Ionicons name="home" size={18} color={Colors.white} />
        </View>
      </Marker>
    </MapView>
  );
}

// Live rider position from pickup to delivery (RF-C06).
export function TrackingMap({ restaurant, customer, rider, style }: { restaurant: LatLng; customer: LatLng; rider: LatLng | null; style?: ViewStyle }) {
  const map = useRef<MapView>(null);
  return (
    <MapView
      ref={map}
      style={[StyleSheet.absoluteFill, style]}
      onMapReady={() =>
        map.current?.fitToCoordinates([restaurant, customer], { edgePadding: { top: 70, bottom: 70, left: 60, right: 60 }, animated: false })
      }
      initialRegion={{
        latitude: (restaurant.latitude + customer.latitude) / 2,
        longitude: (restaurant.longitude + customer.longitude) / 2,
        latitudeDelta: Math.abs(restaurant.latitude - customer.latitude) * 2.4 + 0.004,
        longitudeDelta: Math.abs(restaurant.longitude - customer.longitude) * 2.4 + 0.004,
      }}>
      <Polyline coordinates={[restaurant, customer]} strokeColor={Colors.orange} strokeWidth={4} lineDashPattern={[8, 6]} />
      <Marker coordinate={restaurant} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={[styles.pin, { backgroundColor: Colors.crimson }]}>
          <Ionicons name="restaurant" size={16} color={Colors.white} />
        </View>
      </Marker>
      <Marker coordinate={customer} anchor={{ x: 0.5, y: 0.5 }}>
        <View style={[styles.pin, { backgroundColor: Colors.black }]}>
          <Ionicons name="home" size={16} color={Colors.white} />
        </View>
      </Marker>
      {rider ? (
        <Marker coordinate={rider} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.rider}>
            <Ionicons name="bicycle" size={20} color={Colors.black} />
          </View>
        </Marker>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  rider: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
});
