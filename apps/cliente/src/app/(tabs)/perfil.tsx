import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';
import { auth } from '@/lib/api';
import { useAddresses } from '@/store/addresses';
import { useProfile } from '@/store/profile';

export default function Perfil() {
  const { profile } = useProfile();
  const { addresses } = useAddresses();

  const items: { icon: keyof typeof Ionicons.glyphMap; label: string; detail?: string; href?: Href }[] = [
    { icon: 'location-outline', label: 'Mis direcciones', detail: `${addresses.length} guardadas`, href: '/direcciones' },
    { icon: 'card-outline', label: 'Métodos de pago', detail: 'Pago Móvil' },
    { icon: 'gift-outline', label: 'Invita y gana', detail: '$2 por amigo', href: '/referidos' },
    { icon: 'notifications-outline', label: 'Notificaciones' },
    { icon: 'help-circle-outline', label: 'Ayuda' },
  ];

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text variant="display">Perfil</Text>
        <Pressable style={styles.user} onPress={() => router.push('/editar-perfil')}>
          {profile.photo ? (
            <Image source={profile.photo} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text variant="title">{profile.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text variant="heading">{profile.name}</Text>
            <Text variant="caption">{profile.phone ? `+58 ${profile.phone.slice(0, 3)} ••• ${profile.phone.slice(-4)}` : 'Teléfono verificado'}</Text>
          </View>
          <Ionicons name="create-outline" size={22} color={Colors.black} />
        </Pressable>
        <View style={styles.list}>
          {items.map((item, i) => (
            <Pressable key={item.label} style={[styles.row, i > 0 && styles.divider]} onPress={() => item.href && router.push(item.href)}>
              <Ionicons name={item.icon} size={22} color={Colors.orangeDeep} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {item.label}
              </Text>
              {item.detail ? <Text variant="caption">{item.detail}</Text> : null}
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.logout} onPress={async () => {
            await auth.logout();
            router.replace('/login');
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.crimson} />
          <Text variant="bodyStrong" style={{ color: Colors.crimson }}>
            Cerrar sesión
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  user: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.surface, padding: 16, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.line },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
});
