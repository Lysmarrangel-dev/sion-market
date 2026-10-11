import { Platform } from 'react-native';

type Listener = (n: { title: string; body: string }) => void;
const listeners = new Set<Listener>();

// In-app banner listeners: every status change also shows inside the app.
export function onInAppNotification(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let ready: Promise<typeof import('expo-notifications') | null> | null = null;

function loadNotifications() {
  if (Platform.OS === 'web') return Promise.resolve(null);
  ready ??= import('expo-notifications')
    .then(async (Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: false, // the in-app banner covers the foreground case
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted' ? Notifications : null;
    })
    .catch(() => null);
  return ready;
}

export const requestNotificationPermission = () => loadNotifications();

// Local notification for now; the backend will send real push via FCM/APNs with SMS/WhatsApp fallback (RF-C06).
export async function notify(title: string, body: string) {
  listeners.forEach((l) => l({ title, body }));
  const Notifications = await loadNotifications();
  await Notifications?.scheduleNotificationAsync({ content: { title, body }, trigger: null }).catch(() => {});
}

/**
 * Registers this device's Expo push token with the API so the backend can send real push.
 * Needs the EAS project id (set by `eas init`); without it, it quietly does nothing.
 */
export async function registerPushToken(send: (token: string, platform: 'ios' | 'android') => Promise<unknown>) {
  if (Platform.OS === 'web') return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  const { default: Constants } = await import('expo-constants');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) return;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await send(data, Platform.OS === 'ios' ? 'ios' : 'android');
}
