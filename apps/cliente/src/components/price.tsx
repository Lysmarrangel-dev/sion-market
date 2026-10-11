import { View, type ViewStyle } from 'react-native';

import { Text } from '@/components/text';
import { Colors } from '@/constants/theme';
import { TASA_BCV } from '@/data/catalog';

export const formatUsd = (usd: number) => `$${usd.toFixed(2)}`;
export const formatVes = (usd: number) =>
  `Bs. ${(usd * TASA_BCV).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Every price shows in USD with its VES equivalent at the BCV rate.
export function Price({
  usd,
  size = 'md',
  align = 'left',
  style,
}: {
  usd: number;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
  style?: ViewStyle;
}) {
  const main = size === 'lg' ? 22 : size === 'md' ? 16 : 14;
  return (
    <View style={[{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }, style]}>
      <Text variant="heading" style={{ fontSize: main, lineHeight: main + 4 }}>
        {formatUsd(usd)}
      </Text>
      <Text variant="caption" style={{ fontSize: 12, color: Colors.textMuted }}>
        {formatVes(usd)}
      </Text>
    </View>
  );
}
