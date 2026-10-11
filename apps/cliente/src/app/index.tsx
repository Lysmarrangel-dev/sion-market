import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

import { getSession } from '@/lib/api';

// Signed-in customers, and visitors on the website, go straight to the restaurants.
// First-time phone users see the onboarding.
export default function Index() {
  if (getSession() || Platform.OS === 'web') return <Redirect href="/(tabs)" />;
  return <Redirect href="/onboarding" />;
}
