import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';

// Form pieces for the restaurant panel.

export function Field({ label, hint, ...props }: { label: string; hint?: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="bodyStrong">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }, props.style]}
      />
      {hint ? <Text variant="caption">{hint}</Text> : null}
    </View>
  );
}

/** Fields side by side, sharing the width. */
export function Row({ children }: { children: React.ReactNode[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {children.map((child, i) => (
        <View key={i} style={{ flex: 1 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function Toggle({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable style={styles.toggle} onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{label}</Text>
        {detail ? <Text variant="caption">{detail}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: Colors.orange, false: Colors.line }} thumbColor={Colors.white} />
    </Pressable>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={[styles.chip, on && styles.chipOn]}>
            <Text variant="bodyStrong" style={{ fontSize: 14, color: on ? Colors.inkInverse : Colors.text }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.error}>
      <Text style={{ color: Colors.danger }}>{message}</Text>
    </View>
  );
}

export const formStyles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line, padding: 16, gap: 14 },
});

const styles = StyleSheet.create({
  input: {
    minHeight: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 15,
    color: Colors.text,
  },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  chipOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  error: { backgroundColor: Colors.dangerSoft, borderRadius: Radius.sm, padding: 12 },
});
