import { router } from 'expo-router';
import { View } from 'react-native';

import { IconButton } from '@/components/icon-button';
import { Text } from '@/components/text';

export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
      <IconButton name="arrow-back" onPress={() => router.back()} />
      <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}
