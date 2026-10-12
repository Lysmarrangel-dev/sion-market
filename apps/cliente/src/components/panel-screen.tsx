import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton } from '@/components/icon-button';
import { Text } from '@/components/text';
import { Colors } from '@/constants/theme';
import { useLayout } from '@/lib/layout';
import { goBack } from '@/lib/nav';

/** Scrollable page of the admin panel with its title; detail pages get a back button. */
export function PanelScreen({
  title,
  subtitle,
  wide,
  back,
  right,
  refreshing,
  onRefresh,
  children,
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  back?: boolean;
  right?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}) {
  const { gutter } = useLayout();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: gutter, paddingBottom: 48 }}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={Colors.orange} /> : undefined}>
        <View style={[{ gap: 16, width: '100%', alignSelf: 'center' }, wide && { maxWidth: 1040 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {back ? <IconButton name="arrow-back" onPress={goBack} /> : null}
            <View style={{ flex: 1 }}>
              {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
              <Text variant={back ? 'title' : 'display'} numberOfLines={2}>
                {title}
              </Text>
            </View>
            {right}
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
