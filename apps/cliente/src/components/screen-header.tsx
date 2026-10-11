import { View } from 'react-native';

import { IconButton } from '@/components/icon-button';
import { Text } from '@/components/text';
import { goBack } from '@/lib/nav';

export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
      <IconButton name="arrow-back" onPress={goBack} />
      <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}
