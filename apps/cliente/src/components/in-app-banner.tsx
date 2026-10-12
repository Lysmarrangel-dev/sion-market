import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { Colors, Radius, theme } from '@/constants/theme';
import { onInAppNotification } from '@/lib/notify';

// Shows order status notifications while the app is open.
export function InAppBanner() {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<{ title: string; body: string } | null>(null);
  const [y] = useState(() => new Animated.Value(-160));
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () =>
      onInAppNotification((n) => {
        setCurrent(n);
        clearTimeout(timer.current);
        Animated.spring(y, { toValue: 0, useNativeDriver: true }).start();
        timer.current = setTimeout(() => {
          Animated.timing(y, { toValue: -160, duration: 250, useNativeDriver: true }).start();
        }, 3500);
      }),
    [y],
  );

  if (!current) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.wrap, { top: insets.top + 6, transform: [{ translateY: y }] }]}>
      <View style={styles.icon}>
        <Ionicons name="notifications" size={18} color={Colors.black} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" style={{ color: Colors.white }}>
          {current.title}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{current.body}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.md,
    // Always a dark banner with white text (ink turns white in the dark theme).
    backgroundColor: theme === 'dark' ? Colors.surface : Colors.ink,
    borderWidth: 1,
    borderColor: Colors.line,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.orange, alignItems: 'center', justifyContent: 'center' },
});
