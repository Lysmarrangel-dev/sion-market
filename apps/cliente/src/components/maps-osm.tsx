import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Colors, theme } from '@/constants/theme';
import { COVERAGE_ZONE, type LatLng } from '@/data/catalog';

// Android builds without a Google Maps key: Leaflet + OpenStreetMap inside a WebView,
// with the same props as the Google maps in maps.tsx. The base URL gives tile requests the
// referer that OpenStreetMap's tile policy asks for.

type Pin = { id: string; at: LatLng; color: string; emoji: string };

const pt = (p: LatLng) => [p.latitude, p.longitude];

function html(center: LatLng, picker: boolean) {
  const dark = theme === 'dark' ? '.leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.9) contrast(.9)}' : '';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{margin:0;height:100%;background:${Colors.map}}${dark}</style></head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
var map=L.map('m',{zoomControl:false,attributionControl:true}).setView(${JSON.stringify(pt(center))},16);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
L.polygon(${JSON.stringify(COVERAGE_ZONE.map(pt))},{color:'${Colors.orange}',weight:2,fillOpacity:.08}).addTo(map);
var pins={};
function icon(c,e){return L.divIcon({className:'',iconSize:[36,36],iconAnchor:[18,18],html:'<div style="width:36px;height:36px;border-radius:18px;background:'+c+';border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:16px">'+e+'</div>'})}
function send(ll){window.ReactNativeWebView.postMessage(JSON.stringify({latitude:ll.lat,longitude:ll.lng}))}
window.setPins=function(list,opts){
  var seen={};
  list.forEach(function(p){seen[p.id]=1;
    if(pins[p.id]){pins[p.id].setLatLng(p.at)}else{
      pins[p.id]=L.marker(p.at,{icon:icon(p.color,p.emoji),draggable:${picker}}).addTo(map);
      ${picker ? "pins[p.id].on('dragend',function(e){send(e.target.getLatLng())});" : ''}
    }});
  Object.keys(pins).forEach(function(k){if(!seen[k]){pins[k].remove();delete pins[k]}});
  if(opts.pan)map.panTo(list[0].at);
  if(opts.fit&&list.length>1)map.fitBounds(list.map(function(p){return p.at}),{padding:[60,60]});
};
${picker ? "map.on('click',function(e){send(e.latlng)});" : ''}
window.ReactNativeWebView.postMessage('ready');
</script></body></html>`;
}

function OsmMap({ center, pins, picker, fit, onPick, style }: { center: LatLng; pins: Pin[]; picker: boolean; fit?: boolean; onPick?: (p: LatLng) => void; style?: ViewStyle }) {
  const web = useRef<WebView>(null);
  const ready = useRef(false);
  const first = useRef(true);
  // The page is built once; markers are updated through injected calls.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const source = useMemo(() => ({ html: html(center, picker), baseUrl: 'https://www.sionmarket.app/' }), []);
  const list = pins.map((p) => ({ ...p, at: pt(p.at) }));

  const push = () => {
    if (!ready.current) return;
    const opts = { pan: picker && !first.current, fit: fit && first.current };
    first.current = false;
    web.current?.injectJavaScript(`window.setPins(${JSON.stringify(list)},${JSON.stringify(opts)});true;`);
  };

  useEffect(push);

  const onMessage = (e: WebViewMessageEvent) => {
    if (e.nativeEvent.data === 'ready') {
      ready.current = true;
      push();
    } else onPick?.(JSON.parse(e.nativeEvent.data) as LatLng);
  };

  return (
    <WebView
      ref={web}
      source={source}
      originWhitelist={['*']}
      onMessage={onMessage}
      style={[StyleSheet.absoluteFill, { backgroundColor: Colors.map }, style]}
      scrollEnabled={false}
      setBuiltInZoomControls={false}
    />
  );
}

export function OsmPinPicker({ value, onChange, style }: { value: LatLng; onChange: (p: LatLng) => void; style?: ViewStyle }) {
  return <OsmMap center={value} picker pins={[{ id: 'home', at: value, color: Colors.orange, emoji: '🏠' }]} onPick={onChange} style={style} />;
}

export function OsmTrackingMap({ restaurant, customer, rider, style }: { restaurant: LatLng; customer: LatLng; rider: LatLng | null; style?: ViewStyle }) {
  const pins: Pin[] = [
    { id: 'restaurant', at: restaurant, color: Colors.crimson, emoji: '🍽️' },
    { id: 'home', at: customer, color: '#000', emoji: '🏠' },
  ];
  if (rider) pins.push({ id: 'rider', at: rider, color: Colors.orange, emoji: '🛵' });
  return <OsmMap center={customer} picker={false} fit pins={pins} style={style} />;
}
