import { router } from 'expo-router';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { ApiRequestError, auth, online } from '@/lib/api';
import { useProfile } from '@/store/profile';

export default function Login() {
  const { update } = useProfile();
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const digits = phone.replace(/\D/g, '');
  const valid = digits.length === 10;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={{ gap: 28 }}>
          <Logo height={64} />
          <View style={{ gap: 8 }}>
            <Text variant="display">Entra con tu número</Text>
            <Text variant="caption" style={{ fontSize: 15 }}>
              Te enviaremos un código por SMS o WhatsApp para confirmar que eres tú.
            </Text>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.prefix}>
              <Text style={{ fontSize: 18 }}>🇻🇪</Text>
              <Text variant="bodyStrong">+58</Text>
            </View>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="414 123 4567"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              maxLength={12}
              style={styles.input}
              autoFocus
            />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            O continúa con
          </Text>
          {/* RF-C01 alternate sign-up. Demo: these skip straight in; real OAuth needs the backend. */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(
              [
                ['logo-google', 'Google'],
                ['logo-apple', 'Apple'],
                ['mail-outline', 'Correo'],
              ] as const
            ).map(([icon, label]) => (
              <Pressable key={label} style={styles.alt} onPress={() => router.replace('/(tabs)')} accessibilityLabel={`Continuar con ${label}`}>
                <Ionicons name={icon} size={20} color={Colors.black} />
                <Text variant="bodyStrong" style={{ fontSize: 14 }}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          {error ? (
            <Text variant="caption" style={{ textAlign: 'center', color: Colors.crimson }}>
              {error}
            </Text>
          ) : null}
          <Button
            title={sending ? 'Enviando…' : 'Enviar código'}
            disabled={!valid || sending}
            onPress={async () => {
              setError('');
              if (online) {
                setSending(true);
                try {
                  await auth.requestOtp(`+58${digits}`);
                } catch (e) {
                  setError(e instanceof ApiRequestError ? e.message : 'No pudimos enviar el código. Revisa tu conexión.');
                  return;
                } finally {
                  setSending(false);
                }
              }
              update({ phone: digits });
              router.push({ pathname: '/otp', params: { phone: digits } });
            }}
          />
          <Text variant="caption" style={{ textAlign: 'center' }}>
            Al continuar aceptas los Términos y la Política de privacidad de Sionmarket.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between' },
  inputRow: { flexDirection: 'row', gap: 10 },
  alt: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  input: {
    flex: 1,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.line,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },
});
