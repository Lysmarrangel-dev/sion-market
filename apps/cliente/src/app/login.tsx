import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Logo } from '@/components/logo';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { ApiRequestError, auth, online } from '@/lib/api';
import { useLayout } from '@/lib/layout';
import { useProfile } from '@/store/profile';
import { useWebsiteLogin } from '@/lib/auth-gate';

export default function Login() {
  useWebsiteLogin();
  const { update } = useProfile();
  const { width } = useLayout();
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [google, setGoogle] = useState(false);
  const [error, setError] = useState('');
  const digits = phone.replace(/\D/g, '');
  const valid = digits.length === 10;
  // On the split desktop layout the brand panel already shows the logo.
  const showLogo = width < 980;

  const withGoogle = async () => {
    setError('');
    if (!online) return router.replace('/(tabs)');
    setGoogle(true);
    try {
      const done = await auth.signInWithGoogle();
      // Web navigates away to Google; on the phone we are back with a session.
      if (done && Platform.OS !== 'web') router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'No pudimos entrar con Google. Revisa tu conexión.');
    } finally {
      if (Platform.OS !== 'web') setGoogle(false);
    }
  };

  const sendCode = async () => {
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
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={{ gap: 28 }}>
            {showLogo ? <Logo height={56} /> : null}
            <View style={{ gap: 8 }}>
              <Text variant="display">Entra a Sionmarket</Text>
              <Text variant="caption" style={{ fontSize: 15 }}>
                Pide comida y lo que necesites en San Felipe. Elige cómo quieres entrar.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <Pressable style={styles.provider} onPress={withGoogle} disabled={google} accessibilityRole="button">
                {google ? <ActivityIndicator color={Colors.text} /> : <Ionicons name="logo-google" size={20} color={Colors.text} />}
                <Text variant="bodyStrong">Continuar con Google</Text>
              </Pressable>
              {Platform.OS === 'ios' ? (
                <Pressable
                  style={[styles.provider, { backgroundColor: Colors.black, borderColor: Colors.black }]}
                  onPress={() => (online ? setError('Entrar con Apple llega pronto. Usa Google o tu correo.') : router.replace('/(tabs)'))}
                  accessibilityRole="button">
                  <Ionicons name="logo-apple" size={20} color={Colors.white} />
                  <Text variant="bodyStrong" style={{ color: Colors.white }}>
                    Continuar con Apple
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.provider}
                onPress={() => (online ? router.push('/correo') : router.replace('/(tabs)'))}
                accessibilityRole="button">
                <Ionicons name="mail-outline" size={20} color={Colors.text} />
                <Text variant="bodyStrong">Continuar con correo</Text>
              </Pressable>
            </View>

            <View style={styles.divider}>
              <View style={styles.rule} />
              <Text variant="caption">o con tu número</Text>
              <View style={styles.rule} />
            </View>

            <View style={{ gap: 12 }}>
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
                  onSubmitEditing={() => valid && !sending && sendCode()}
                />
              </View>
              <Button title={sending ? 'Enviando…' : 'Enviar código'} disabled={!valid || sending} onPress={sendCode} />
            </View>

            {error ? (
              <View style={styles.error}>
                <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                <Text variant="caption" style={{ color: Colors.danger, flex: 1 }}>
                  {error}
                </Text>
              </View>
            ) : null}
          </View>

          <Text variant="caption" style={{ textAlign: 'center', marginTop: 32 }}>
            Al continuar aceptas los Términos y la Política de privacidad de Sionmarket.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'space-between', width: '100%', maxWidth: 480, alignSelf: 'center' },
  provider: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.line,
    backgroundColor: Colors.surface,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rule: { flex: 1, height: 1, backgroundColor: Colors.line },
  inputRow: { flexDirection: 'row', gap: 10 },
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
    minWidth: 0,
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
  error: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.sm,
    backgroundColor: Colors.dangerSoft,
  },
});
