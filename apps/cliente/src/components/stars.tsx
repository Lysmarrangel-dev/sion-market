import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { Colors } from '@/constants/theme';

export function Stars({ value, onChange, size = 36, label }: { value: number; onChange: (n: number) => void; size?: number; label: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="adjustable" accessibilityLabel={`${label}: ${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={4} accessibilityLabel={`${n} estrellas`}>
          <Ionicons name={n <= value ? 'star' : 'star-outline'} size={size} color={Colors.orange} />
        </Pressable>
      ))}
    </View>
  );
}
