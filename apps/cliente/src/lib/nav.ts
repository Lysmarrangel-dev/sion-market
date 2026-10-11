import { router } from 'expo-router';

/** Back if there is somewhere to go back to; on the web a shared link may be the first page. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)');
}
