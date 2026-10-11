import { Appearance, Platform } from 'react-native';

export type ThemeName = 'light' | 'dark';

// Same key as the website (sionmarket-web/js/tema.js), so the theme carries over between both.
const THEME_KEY = 'sm-tema';

function storedTheme(): ThemeName | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    const t = window.localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null;
  }
}

/** Chosen once at startup: the saved choice on web, otherwise the device setting. */
export const theme: ThemeName =
  storedTheme() ??
  (Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : Appearance.getColorScheme() === 'dark'
      ? 'dark'
      : 'light');

/**
 * Switches theme. Styles are built when each screen module loads, so on web the page
 * reloads with the new palette; the phone app follows the device setting.
 */
export function setTheme(next: ThemeName) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {}
  window.location.reload();
}

// Tokens from the SionMarket brand manual. `black`/`white` are literal (text on orange,
// photos, the gradient); `ink`/`inkInverse` are the strongest foreground and its opposite.
const brand = {
  orange: '#FB6301',
  orangeDeep: '#E85407',
  ember: '#D93A0B',
  crimson: '#B30A24',
  black: '#000000',
  ink: '#1A1A1A',
  white: '#FFFFFF',
} as const;

const light = {
  ...brand,
  ink: '#000000',
  inkInverse: '#FFFFFF',
  text: '#111111',
  textMuted: '#6B6B6B',
  surface: '#FFFFFF',
  background: '#F7F5F2',
  backdrop: '#EFEAE4',
  map: '#EFE9E1',
  line: '#ECE7E1',
  orangeSoft: '#FFF0E6',
  success: '#1F9D55',
  successSoft: '#E8F6EE',
  danger: '#B30A24',
  dangerSoft: '#FDECEE',
};

// Matches the website's dark tokens (css/styles.css).
const dark: typeof light = {
  ...brand,
  ink: '#FFFFFF',
  inkInverse: '#000000',
  text: '#FFFFFF',
  textMuted: '#A29E97',
  surface: '#1A1A1A',
  background: '#0B0B0B',
  backdrop: '#000000',
  map: '#202020',
  line: '#2C2C2C',
  orangeSoft: '#2A1606',
  success: '#6FD39A',
  successSoft: '#0E2A1A',
  danger: '#FF8A8A',
  dangerSoft: '#2E0F14',
};

export const Colors = theme === 'dark' ? dark : light;

// Brand gradient FB6301 → E85407 → D93A0B → B30A24.
export const BrandGradient = [brand.orange, brand.orangeDeep, brand.ember, brand.crimson] as const;

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
