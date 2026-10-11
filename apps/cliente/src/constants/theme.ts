// Tokens from the SionMarket brand manual.
export const Colors = {
  orange: '#FB6301',
  orangeDeep: '#E85407',
  ember: '#D93A0B',
  crimson: '#B30A24',
  black: '#000000',
  ink: '#1A1A1A',
  white: '#FFFFFF',
  text: '#111111',
  textMuted: '#6B6B6B',
  surface: '#FFFFFF',
  background: '#F7F5F2',
  line: '#ECE7E1',
  orangeSoft: '#FFF0E6',
  success: '#1F9D55',
} as const;

// Brand gradient FB6301 → E85407 → D93A0B → B30A24.
export const BrandGradient = [Colors.orange, Colors.orangeDeep, Colors.ember, Colors.crimson] as const;

// The brand's 16° angle motif.
export const BRAND_ANGLE = '-16deg';

export const Fonts = {
  display: 'Montserrat_800ExtraBold',
  heading: 'Montserrat_700Bold',
  headingMedium: 'Montserrat_600SemiBold',
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  bodyBold: 'HankenGrotesk_700Bold',
} as const;

export const Radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
