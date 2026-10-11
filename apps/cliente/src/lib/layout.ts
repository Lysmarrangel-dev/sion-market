import { useWindowDimensions } from 'react-native';

// Breakpoints for the web build (they also apply to tablets).
export const WIDE = 768;
export const DESKTOP = 1100;
export const CONTENT_MAX = 1200;
export const COLUMN_MAX = 680;
export const GUTTER = 16;

export function useLayout() {
  const { width, height } = useWindowDimensions();
  const wide = width >= WIDE;
  const desktop = width >= DESKTOP;
  const gutter = wide ? 24 : GUTTER;
  // Width of the centred content area, without its side padding.
  const content = Math.min(width, CONTENT_MAX) - gutter * 2;
  return { width, height, wide, desktop, gutter, content, columns: desktop ? 3 : wide ? 2 : 1 };
}

/** Width of one cell in a grid of `columns` with `gap` between cells. */
export function cellWidth(content: number, columns: number, gap: number) {
  return Math.floor((content - gap * (columns - 1)) / columns);
}
