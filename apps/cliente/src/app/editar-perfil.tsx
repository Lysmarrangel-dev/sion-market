import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ScreenHeader } from '@/components/screen-header';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { useProfile } from '@/store/profile';
import { goBack } from '@/lib/nav';

// RF-C01 profile: name, verified phone, email and optional photo.
export default function EditarPerfil() {
  const { profile, update } = useProfile();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [photo, setPhoto] = useState(profile.photo);

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScreenHeader title="Mi perfil" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Pressable style={{ alignSelf: 'center' }} onPress={pick} accessibilityLabel="Cambiar foto de perfil">
          {photo ? (
            <Image source={photo} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.placeholder]}>
              <Text variant="display">{name.charAt(0).toUpperCase() || 'S'}</Text>
            </View>
          )}
          <View style={styles.camera}>
            <Ionicons name="camera" size={16} color={Colors.white} />
          </View>
        </Pressable>
        <Field label="Nombre" value={name} onChangeText={setName} />
        <View style={{ gap: 6 }}>
          <Text variant="bodyStrong">Teléfono</Text>
          <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text>{profile.phone ? `+58 ${profile.phone}` : '+58 ••• ••• ••••'}</Text>
            <Text variant="caption" style={{ color: Colors.success }}>
              ✓ Verificado
            </Text>
          </View>
        </View>
        <Field label="Correo (opcional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Button
          title="Guardar"
          disabled={!name.trim()}
          onPress={() => {
            update({ name: name.trim(), email: email.trim(), photo });
            goBack();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="bodyStrong">{label}</Text>
      <TextInput {...props} accessibilityLabel={label} placeholderTextColor={Colors.textMuted} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 104, height: 104, borderRadius: 52 },
  placeholder: { backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center' },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  input: {
    minHeight: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
  },
});
