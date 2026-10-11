import { StyleSheet, View } from 'react-native';

import { BRAND_ANGLE } from '@/constants/theme';

// Decorative stripes using the brand's 16° angle.
export function AngleStripes({ color = 'rgba(255,255,255,0.12)', count = 5 }: { color?: string; count?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: -80,
            bottom: -80,
            left: `${i * 22 + 10}%`,
            width: 28,
            backgroundColor: color,
            transform: [{ rotate: BRAND_ANGLE }],
          }}
        />
      ))}
    </View>
  );
}
