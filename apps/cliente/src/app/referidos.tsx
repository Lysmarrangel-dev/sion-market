import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { formatUsd } from '@/components/price';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { useProfile } from '@/store/profile';

const REWARD_USD = 2;

// RF-C09: referral program with credit for both people.
export default function Referidos() {
  const { profile } = useProfile();
  const share = () =>
    Share.share({
      message: `Pide comida en San Felipe con Sionmarket. Usa mi código ${profile.referralCode} y los dos ganamos ${formatUsd(REWARD_USD)} en tu primer pedido.`,
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader title="Invita y gana" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={styles.hero}>
          <Ionicons name="gift" size={48} color={Colors.black} />
          <Text variant="title" style={{ textAlign: 'center' }}>
            Tú ganas {formatUsd(REWARD_USD)} y tu amigo también
          </Text>
          <Text style={{ textAlign: 'center' }}>Cuando tu amigo haga su primer pedido con tu código, los dos reciben crédito.</Text>
        </View>
        <View style={styles.code}>
          <Text variant="label" style={{ color: Colors.textMuted }}>
            Tu código
          </Text>
          <Text variant="display" selectable>
            {profile.referralCode}
          </Text>
        </View>
        <Button title="Compartir mi código" onPress={share} />
        <View style={styles.row}>
          <Text style={{ flex: 1 }}>Crédito disponible</Text>
          <Text variant="heading">{formatUsd(profile.creditUsd)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, padding: 24, borderRadius: Radius.lg, backgroundColor: Colors.orange },
  code: { alignItems: 'center', gap: 4, padding: 18, borderRadius: Radius.md, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.orange, backgroundColor: Colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: Radius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.line },
});
