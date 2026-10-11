import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors } from '@/constants/theme';

export function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.btn} hitSlop={6} onPress={() => onChange(Math.max(min, value - 1))}>
        <Ionicons name={value <= 1 && min === 0 ? 'trash-outline' : 'remove'} size={18} color={Colors.ink} />
      </Pressable>
      <Text variant="heading" style={styles.value}>
        {value}
      </Text>
      <Pressable style={[styles.btn, styles.plus]} hitSlop={6} onPress={() => onChange(value + 1)}>
        <Ionicons name="add" size={18} color={Colors.black} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  plus: { backgroundColor: Colors.orange, borderColor: Colors.orange },
  value: { minWidth: 18, textAlign: 'center' },
});
