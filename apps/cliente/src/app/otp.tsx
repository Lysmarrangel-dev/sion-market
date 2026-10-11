import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { IconButton } from '@/components/icon-button';
import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { ApiRequestError, auth, online } from '@/lib/api';
import { goBack } from '@/lib/nav';
import { useWebsiteLogin } from '@/lib/auth-gate';

const LENGTH = 6;

export default function Otp() {
  useWebsiteLogin();
  const { phone = '' } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(30);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const input = useRef<TextInput>(null);

  const enter = async () => {
    if (online) {
      if (checking) return;
      setChecking(true);
      setError('');
      try {
        await auth.verifyOtp(`+58${phone}`, code);
      } catch (e) {
        setError(e instanceof ApiRequestError ? e.message : 'No pudimos verificar el código. Revisa tu conexión.');
        setCode('');
        return;
      } finally {
        setChecking(false);
      }
    }
    // Drop the auth screens from history so back never returns to them.
    router.dismissAll();
    router.replace('/(tabs)');
  };

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  // Verify as soon as the sixth digit is typed. In demo mode any code is accepted.
  useEffect(() => {
    if (code.length === LENGTH) {
      const t = setTimeout(enter, 350);
      return () => clearTimeout(t);
    }
  }, [code]);

  const masked = phone ? `+58 ${phone.slice(0, 3)} ••• ${phone.slice(-4)}` : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.surface }}>
      <View style={styles.container}>
        <IconButton name="arrow-back" onPress={goBack} />
        <View style={{ gap: 8, marginTop: 24 }}>
          <Text variant="display">Escribe el código</Text>
          <Text variant="caption" style={{ fontSize: 15 }}>
            Lo enviamos por SMS o WhatsApp al {masked}
          </Text>
        </View>

        <Pressable style={styles.cells} onPress={() => input.current?.focus()}>
          {Array.from({ length: LENGTH }).map((_, i) => {
            const active = i === code.length;
            return (
              <View key={i} style={[styles.cell, active && styles.cellActive, code[i] && styles.cellFilled]}>
                <Text style={styles.digit}>{code[i] ?? ''}</Text>
              </View>
            );
          })}
        </Pressable>
        <TextInput
          ref={input}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, LENGTH))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          autoFocus
          style={styles.hidden}
        />

        <Text variant="caption" style={{ textAlign: 'center', marginTop: 24 }}>
          {seconds > 0 ? (
            `Reenviar código en 0:${String(seconds).padStart(2, '0')}`
          ) : (
            <Text
              variant="bodyStrong"
              style={{ color: Colors.orangeDeep }}
              onPress={() => {
                setSeconds(30);
                if (online) auth.requestOtp(`+58${phone}`).catch(() => setError('No pudimos reenviar el código.'));
              }}
            >
              Reenviar código
            </Text>
          )}
        </Text>

        <View style={{ flex: 1 }} />
        {error ? (
          <Text variant="caption" style={{ textAlign: 'center', marginBottom: 12, color: Colors.danger }}>
            {error}
          </Text>
        ) : !online ? (
          <Text variant="caption" style={{ textAlign: 'center', marginBottom: 12 }}>
            Demo: cualquier código de 6 dígitos funciona.
          </Text>
        ) : null}
        <Button title={checking ? 'Verificando…' : 'Verificar'} disabled={code.length < LENGTH || checking} onPress={enter} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  cells: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 36 },
  cell: {
    width: 48,
    height: 58,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.line,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderColor: Colors.orange, backgroundColor: Colors.surface },
  cellFilled: { borderColor: Colors.ink, backgroundColor: Colors.surface },
  digit: { fontFamily: Fonts.display, fontSize: 24 },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});
