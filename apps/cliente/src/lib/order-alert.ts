import { Platform } from 'react-native';

import { notify } from '@/lib/notify';

// Alert for a restaurant when an order comes in. On the phone it is a local notification with
// sound plus the in-app banner; on the web, a chime, the banner, a browser notification when the
// tab is in the background and a counter in the tab title until the tab is looked at again.

const web = Platform.OS === 'web' && typeof window !== 'undefined';

let audio: AudioContext | null = null;
function audioContext() {
  if (!web) return null;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  audio ??= new Ctx();
  return audio;
}

// Browsers only let a page play sound after the person interacted with it.
if (web) {
  const unlock = () => {
    void audioContext()?.resume();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

/** Three rising notes, loud enough to hear in a kitchen. */
function chime() {
  const ctx = audioContext();
  if (!ctx || ctx.state !== 'running') return;
  [880, 1175, 1568].forEach((freq, i) => {
    const at = ctx.currentTime + i * 0.18;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.4, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.4);
  });
}

let unseen = 0;
let baseTitle = '';
function badgeTitle() {
  if (!web || !document.hidden) return;
  if (!unseen) baseTitle = document.title;
  unseen += 1;
  document.title = `(${unseen}) Nuevo pedido · ${baseTitle}`;
}
if (web) {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && unseen) {
      document.title = baseTitle;
      unseen = 0;
    }
  });
}

export type WebAlerts = 'granted' | 'denied' | 'default' | 'unsupported';

export function webAlertsState(): WebAlerts {
  if (!web || typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/** Asks the browser for notifications (needs a click) and unlocks the chime. */
export async function enableWebAlerts(): Promise<WebAlerts> {
  void audioContext()?.resume();
  if (webAlertsState() === 'unsupported') return 'unsupported';
  return Notification.requestPermission();
}

export function alertNewOrder(code: string) {
  const title = 'Nuevo pedido';
  const body = `Pedido ${code}: acéptalo para que el cliente no espere.`;
  void notify(title, body);
  if (!web) return;
  chime();
  badgeTitle();
  if (document.hidden && webAlertsState() === 'granted') {
    const n = new Notification(title, { body, tag: code, requireInteraction: true });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  }
}

/** Plays the alert once so the restaurant can check the volume. */
export function testAlert() {
  void audioContext()?.resume().then(chime);
  if (!web) void notify('Así suena un pedido nuevo', 'Las alertas están activas en este teléfono.');
}
