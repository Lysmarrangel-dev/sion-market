import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { ApiRequestError, auth } from '@/lib/api';
import { goBack } from '@/lib/nav';
import { useWebsiteLogin } from '@/lib/auth-gate';

/** Email + password, the same account the customer may already have from the website. */
export default function Correo() {
  useWebsiteLogin();
  const [mode, setMode] = useState<'entrar' | 'crear'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 6;

  const submit = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'entrar') await auth.signInWithEmail(email.trim(), password);
      else if ((await auth.signUpWithEmail(email.trim(), password)).needsConfirmation) {
        setNotice('Te enviamos un enlace a tu correo. Ábrelo para confirmar la cuenta y luego entra aquí.');
        setMode('entrar');
        return;
      }
      router.dismissAll();
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : 'No pudimos iniciar sesión. Revisa tu conexión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <View style={{ gap: 20 }}>
          <IconButton name="arrow-back" onPress={goBack} />
          <View style={{ gap: 8 }}>
            <Text variant="display">{mode === 'entrar' ? 'Entra con tu correo' : 'Crea tu cuenta'}</Text>
            <Text variant="caption" style={{ fontSize: 15 }}>
              {mode === 'entrar' ? 'Usa la misma cuenta de sionmarket.app si ya tienes una.' : 'Solo necesitas un correo y una clave de 6 caracteres o más.'}
            </Text>
          </View>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tucorreo@ejemplo.com"
            placeholderTextColor={Colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoFocus
            style={styles.input}
            accessibilityLabel="Correo"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Clave"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
            style={styles.input}
            accessibilityLabel="Clave"
            onSubmitEditing={() => valid && !busy && submit()}
          />
        </View>

        <View style={{ gap: 12 }}>
          {error ? (
            <Text variant="caption" style={{ textAlign: 'center', color: Colors.danger }}>
              {error}
            </Text>
          ) : notice ? (
            <Text variant="caption" style={{ textAlign: 'center' }}>
              {notice}
            </Text>
          ) : null}
          <Button title={busy ? 'Un momento…' : mode === 'entrar' ? 'Entrar' : 'Crear cuenta'} disabled={!valid || busy} onPress={submit} />
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {mode === 'entrar' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <Text
              variant="bodyStrong"
              style={{ color: Colors.orangeDeep }}
              onPress={() => {
                setError('');
                setMode(mode === 'entrar' ? 'crear' : 'entrar');
              }}
            >
              {mode === 'entrar' ? 'Créala aquí' : 'Entra'}
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between' },
  input: {
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.line,
    paddingHorizontal: 16,
    fontSize: 17,
    fontFamily: Fonts.bodyMedium,
    color: Colors.text,
  },
});
