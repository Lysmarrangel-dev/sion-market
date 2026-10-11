import 'leaflet/dist/leaflet.css';

import type * as Leaflet from 'leaflet';
import { useEffect, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Colors, theme } from '@/constants/theme';
import { COVERAGE_ZONE, type LatLng } from '@/data/catalog';

// Web map: Leaflet with OpenStreetMap tiles (no API key). Leaflet touches `window` when imported,
// so it is loaded inside effects and never during the static export.
type L = typeof Leaflet;
const loadLeaflet = () => import('leaflet').then((m) => ((m as { default?: L }).default ?? m) as L);

const ZOOM = 16;
const ICONS = { home: '🏠', restaurant: '🍽️', bicycle: '🛵' } as const;

// Dark theme: invert the light OSM tiles instead of loading a second tile set.
if (typeof document !== 'undefined' && theme === 'dark') {
  const css = document.createElement('style');
  css.textContent = '.sm-tiles-dark{filter:invert(1) hue-rotate(180deg) brightness(.9) contrast(.9)}';
  document.head.appendChild(css);
}

const toLeaflet = (p: LatLng): [number, number] => [p.latitude, p.longitude];

function pin(L: L, color: string, icon: keyof typeof ICONS) {
  return L.divIcon({
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div style="width:36px;height:36px;border-radius:18px;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1">${ICONS[icon]}</div>`,
  });
}

// Creates the Leaflet map in the View's DOM node and tears it down on unmount.
function useLeafletMap(onReady: (L: L, map: Leaflet.Map) => void, center: LatLng) {
  const node = useRef<View>(null);
  const ready = useRef(onReady);
  ready.current = onReady;

  useEffect(() => {
    let map: Leaflet.Map | undefined;
    let cancelled = false;
    loadLeaflet().then((L) => {
      const el = node.current as unknown as HTMLElement | null;
      if (cancelled || !el) return;
      map = L.map(el, { zoomControl: false }).setView(toLeaflet(center), ZOOM);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        className: theme === 'dark' ? 'sm-tiles-dark' : '',
      }).addTo(map);
      L.polygon(COVERAGE_ZONE.map(toLeaflet), { color: Colors.orange, weight: 2, fillColor: Colors.orange, fillOpacity: 0.08 }).addTo(map);
      ready.current(L, map);
      // The container can still be sizing itself when the map mounts.
      setTimeout(() => map?.invalidateSize(), 0);
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
    // The map is created once; later changes go through the handles passed to onReady.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return node;
}

export function PinPicker({ value, onChange, style }: { value: LatLng; onChange: (p: LatLng) => void; style?: ViewStyle }) {
  const marker = useRef<Leaflet.Marker>(null);
  const map = useRef<Leaflet.Map>(null);
  const change = useRef(onChange);
  change.current = onChange;

  const node = useLeafletMap((L, m) => {
    map.current = m;
    const at = (ll: Leaflet.LatLng) => change.current({ latitude: ll.lat, longitude: ll.lng });
    marker.current = L.marker(toLeaflet(value), { draggable: true, icon: pin(L, Colors.orange, 'home') })
      .on('dragend', (e) => at((e.target as Leaflet.Marker).getLatLng()))
      .addTo(m);
    m.on('click', (e) => at(e.latlng));
  }, value);

  // Follow the value when it changes from outside (tap, drag or "Mi ubicación").
  useEffect(() => {
    if (!marker.current || !map.current) return;
    const current = marker.current.getLatLng();
    if (current.lat === value.latitude && current.lng === value.longitude) return;
    marker.current.setLatLng(toLeaflet(value));
    map.current.panTo(toLeaflet(value));
  }, [value]);

  return <View ref={node} style={[StyleSheet.absoluteFill, styles.map, style]} />;
}

export function TrackingMap({ restaurant, customer, rider, style }: { restaurant: LatLng; customer: LatLng; rider: LatLng | null; style?: ViewStyle }) {
  const riderMarker = useRef<Leaflet.Marker>(null);
  const riderAt = useRef(rider);
  riderAt.current = rider;
  const lib = useRef<L>(null);
  const map = useRef<Leaflet.Map>(null);

  const node = useLeafletMap((L, m) => {
    lib.current = L;
    map.current = m;
    L.polyline([toLeaflet(restaurant), toLeaflet(customer)], { color: Colors.orange, weight: 4, dashArray: '8 6' }).addTo(m);
    L.marker(toLeaflet(restaurant), { icon: pin(L, Colors.crimson, 'restaurant') }).addTo(m);
    L.marker(toLeaflet(customer), { icon: pin(L, '#000', 'home') }).addTo(m);
    m.fitBounds([toLeaflet(restaurant), toLeaflet(customer)], { padding: [60, 60] });
    placeRider(riderAt.current);
  }, customer);

  function placeRider(rider: LatLng | null) {
    const L = lib.current;
    const m = map.current;
    if (!L || !m) return;
    if (!rider) {
      riderMarker.current?.remove();
      riderMarker.current = null;
    } else if (riderMarker.current) {
      riderMarker.current.setLatLng(toLeaflet(rider));
    } else {
      riderMarker.current = L.marker(toLeaflet(rider), { icon: pin(L, Colors.orange, 'bicycle') }).addTo(m);
    }
  }

  useEffect(() => placeRider(rider), [rider]);

  return <View ref={node} style={[StyleSheet.absoluteFill, styles.map, style]} />;
}

const styles = StyleSheet.create({
  map: { backgroundColor: Colors.map, overflow: 'hidden', zIndex: 0 },
});
