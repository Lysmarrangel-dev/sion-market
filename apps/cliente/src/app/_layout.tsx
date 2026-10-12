import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk';
import {
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/montserrat';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { Colors, theme } from '@/constants/theme';
import { InAppBanner } from '@/components/in-app-banner';
import { ScreenFrame, type Frame } from '@/components/screen-frame';
import { loadCatalog } from '@/data/catalog';
import { api, onSessionChange, online, restoreSession } from '@/lib/api';
import { registerPushToken } from '@/lib/notify';
import { AddressProvider } from '@/store/addresses';
import { CartProvider } from '@/store/cart';
import { OrdersProvider } from '@/store/orders';
import { ProfileProvider } from '@/store/profile';

SplashScreen.preventAutoHideAsync();

// How each screen sits on a wide window (see ScreenFrame); anything not listed is a centred page.
const FRAMES: Record<string, Frame> = {
  login: 'auth',
  otp: 'auth',
  correo: 'auth',
  onboarding: 'card',
  '(tabs)': 'wide',
  'restaurante/[id]': 'wide',
  negocio: 'wide',
  admin: 'wide',
};

// Online: restore the saved session and load the catalog before the first screen renders.
const boot = online ? Promise.all([restoreSession(), loadCatalog()]).catch(() => {}) : Promise.resolve();

if (online) {
  onSessionChange((s) => {
    if (s) registerPushToken((token, platform) => api('POST', '/yo/dispositivos', { token, platform })).catch(() => {});
  });
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_700Bold,
  });

  const [booted, setBooted] = useState(!online);
  useEffect(() => {
    boot.then(() => setBooted(true));
  }, []);

  const ready = (loaded || !!error) && booted;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ProfileProvider>
      <AddressProvider>
        <CartProvider>
          <OrdersProvider>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}
        screenLayout={({ route, children }) => <ScreenFrame frame={FRAMES[route.name] ?? 'page'}>{children}</ScreenFrame>}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="producto/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="direcciones/nueva" options={{ presentation: 'modal' }} />
      </Stack>
      <InAppBanner />
          </OrdersProvider>
        </CartProvider>
      </AddressProvider>
    </ProfileProvider>
  );
}
