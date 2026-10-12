import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius } from '@/constants/theme';

/** Small yes/no state pill: green when on; red when off, or grey for a soft (non-alarming) state. */
export function Badge({ on, yes, no, soft }: { on: boolean; yes: string; no: string; soft?: boolean }) {
  const color = on ? Colors.success : soft ? Colors.textMuted : Colors.danger;
  return (
    <View style={[styles.badge, { backgroundColor: on ? Colors.successSoft : soft ? Colors.background : Colors.dangerSoft }]}>
      <Text variant="caption" style={{ color, fontSize: 12 }}>
        {on ? yes : no}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill },
});
