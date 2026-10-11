import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Fonts, Radius } from '@/constants/theme';

type Props = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: 'primary' | 'dark' | 'outline' | 'ghost';
  right?: React.ReactNode;
  style?: ViewStyle;
};

export function Button({ title, variant = 'primary', right, style, disabled, ...props }: Props) {
  const v = variants[variant];
  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        v.container,
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
        disabled && { opacity: 0.4 },
        style,
      ]}>
      <Text style={[styles.label, { color: v.color }]}>{title}</Text>
      {right ? <View style={styles.right}>{right}</View> : null}
    </Pressable>
  );
}

const variants = {
  // Brand rule: text on orange is always black.
  primary: { container: { backgroundColor: Colors.orange }, color: Colors.black },
  dark: { container: { backgroundColor: Colors.ink }, color: Colors.inkInverse },
  outline: { container: { borderWidth: 1.5, borderColor: Colors.ink }, color: Colors.ink },
  ghost: { container: {}, color: Colors.ink },
};

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 22,
  },
  label: { fontFamily: Fonts.heading, fontSize: 16 },
  right: { position: 'absolute', right: 20 },
});
