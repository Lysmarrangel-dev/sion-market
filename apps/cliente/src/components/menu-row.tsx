import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';

/** A card of tappable rows (settings, shortcuts). */
export function MenuList({ children }: { children: React.ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

export function Row({
  icon,
  label,
  detail,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={22} color={danger ? Colors.danger : Colors.orangeDeep} />
      <Text variant="bodyStrong" style={{ flex: 1, color: danger ? Colors.danger : Colors.text }}>
        {label}
      </Text>
      {detail ? <Text variant="caption">{detail}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.line },
});
