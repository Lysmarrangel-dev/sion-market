import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { requireLogin } from '@/lib/auth-gate';

/** Shown in place of a signed-in-only tab while the visitor is browsing without an account. */
export function LoginPrompt({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <SafeAreaView edges={['top']} style={styles.page}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name={icon} size={30} color={Colors.black} />
        </View>
        <Text variant="title" style={{ textAlign: 'center' }}>
          {title}
        </Text>
        <Text variant="caption" style={{ textAlign: 'center', fontSize: 15 }}>
          {body}
        </Text>
        <Button title="Entrar o crear cuenta" onPress={requireLogin} />
        <Button title="Ver restaurantes" variant="ghost" onPress={() => router.navigate('/(tabs)')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: 12,
    padding: 24,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  icon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    transform: [{ rotate: '-16deg' }],
  },
});
