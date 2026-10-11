import { Text as RNText, type TextProps } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'label';

const styles: Record<Variant, object> = {
  display: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  title: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: Fonts.heading, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: Fonts.bodyBold, fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 18, color: Colors.textMuted },
  label: { fontFamily: Fonts.headingMedium, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
};

export function Text({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <RNText {...props} style={[{ color: Colors.text }, styles[variant], style]} />;
}
