import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';

export type Message = {
  id: string;
  from: 'me' | 'them';
  text: string;
  photo?: string;
  location?: boolean;
  status?: 'enviado' | 'entregado' | 'leido';
};

let seq = 0;
const nextId = () => `m${++seq}`;

// Shared chat UI for the rider chat and the Sion IA assistant.
export function Chat({
  initial,
  reply,
  placeholder,
  suggestions,
  header,
  receipts,
  attachments,
  disabled,
}: {
  initial: Message[];
  reply: (text: string) => string;
  placeholder: string;
  suggestions?: string[];
  header?: React.ReactNode;
  receipts?: boolean;
  attachments?: { onLocation: () => Promise<string | null>; onPhoto: () => Promise<string | null> };
  disabled?: string;
}) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const list = useRef<FlatList>(null);

  const setStatus = (id: string, status: Message['status']) =>
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, status } : x)));

  const push = (msg: Omit<Message, 'id' | 'from' | 'status'>, replyTo: string) => {
    const id = nextId();
    setMessages((m) => [...m, { ...msg, id, from: 'me', status: 'enviado' }]);
    // Demo delivery/read receipts (RF-C07) and an automatic answer.
    setTimeout(() => setStatus(id, 'entregado'), 400);
    setTimeout(() => {
      setStatus(id, 'leido');
      setTyping(true);
    }, 900);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { id: nextId(), from: 'them', text: reply(replyTo) }]);
    }, 1900);
  };

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setDraft('');
    push({ text: clean }, clean);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m) => m.id}
        ListHeaderComponent={header ? <>{header}</> : null}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.from === 'me' ? styles.me : styles.them]}>
            {item.photo ? <Image source={item.photo} style={styles.photo} contentFit="cover" /> : null}
            {item.location ? (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={18} color={Colors.black} />
                <Text variant="bodyStrong">Ubicación compartida</Text>
              </View>
            ) : null}
            {item.text ? <Text style={{ color: item.from === 'me' ? Colors.black : Colors.text }}>{item.text}</Text> : null}
            {receipts && item.from === 'me' && item.status ? (
              <View style={styles.receipt}>
                <Ionicons
                  name={item.status === 'enviado' ? 'checkmark' : 'checkmark-done'}
                  size={14}
                  color={item.status === 'leido' ? Colors.danger : 'rgba(0,0,0,0.5)'}
                />
                <Text style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)' }}>{item.status === 'leido' ? 'Leído' : item.status === 'entregado' ? 'Entregado' : 'Enviado'}</Text>
              </View>
            ) : null}
          </View>
        )}
        ListFooterComponent={
          typing ? (
            <View style={[styles.bubble, styles.them]}>
              <Text variant="caption">Escribiendo…</Text>
            </View>
          ) : null
        }
      />
      {disabled ? (
        <View style={styles.disabled}>
          <Text variant="caption" style={{ textAlign: 'center' }}>
            {disabled}
          </Text>
        </View>
      ) : (
        <>
          {suggestions?.length ? (
            <ScrollView
              horizontal
              style={{ flexGrow: 0 }}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestions}
              keyboardShouldPersistTaps="handled">
              {suggestions.map((s) => (
                <Pressable key={s} style={styles.chip} onPress={() => send(s)}>
                  <Text variant="bodyStrong" style={{ fontSize: 13 }}>
                    {s}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <View style={styles.inputBar}>
            {attachments ? (
              <>
                <Pressable
                  style={styles.attach}
                  accessibilityLabel="Enviar ubicación"
                  onPress={async () => {
                    const where = await attachments.onLocation();
                    if (where) push({ text: where, location: true }, 'ubicación');
                  }}>
                  <Ionicons name="location-outline" size={22} color={Colors.text} />
                </Pressable>
                <Pressable
                  style={styles.attach}
                  accessibilityLabel="Enviar foto"
                  onPress={async () => {
                    const uri = await attachments.onPhoto();
                    if (uri) push({ text: '', photo: uri }, 'foto');
                  }}>
                  <Ionicons name="camera-outline" size={22} color={Colors.text} />
                </Pressable>
              </>
            ) : null}
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={placeholder}
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              onSubmitEditing={() => send(draft)}
              returnKeyType="send"
              accessibilityLabel={placeholder}
            />
            <Pressable style={styles.send} onPress={() => send(draft)} accessibilityLabel="Enviar">
              <Ionicons name="send" size={18} color={Colors.black} />
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, gap: 6 },
  me: { alignSelf: 'flex-end', backgroundColor: Colors.orange, borderBottomRightRadius: 4 },
  them: { alignSelf: 'flex-start', backgroundColor: Colors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.line },
  photo: { width: 200, height: 150, borderRadius: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  receipt: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-end' },
  suggestions: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.orangeSoft },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.surface },
  attach: { width: 40, height: 46, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
  },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center' },
  disabled: { padding: 16, borderTopWidth: 1, borderTopColor: Colors.line, backgroundColor: Colors.surface },
});
