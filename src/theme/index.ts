import { Platform } from 'react-native';

/**
 * Visual tokens. Dark-first: near-black surfaces, warm ivory text and a
 * restrained gold accent, with a gold gradient reserved for the few moments
 * that deserve it (the rate card, the primary action, the tab indicator).
 * A light scheme is kept for future use; the app ships dark.
 */
export const Gold = {
  gradient: ['#F7E3A1', '#D9B64A', '#9C7A1E'] as const,
  gradientSoft: ['#2A2416', '#1C1811'] as const,
  base: '#D9B64A',
  bright: '#F1D47C',
  deep: '#9C7A1E',
  onGold: '#1A1507',
} as const;

export const Palette = {
  dark: {
    background: '#0C0B09',
    surface: '#161411',
    surfaceAlt: '#211D16',
    border: '#35301F',
    borderStrong: '#5A4A1F',
    text: '#F4ECD8',
    textSecondary: '#B3A78A',
    textTertiary: '#7A7056',
    accent: Gold.base,
    accentSoft: '#2A2416',
    onAccent: Gold.onGold,
    positive: '#7ED3A0',
    positiveSoft: '#16301F',
    negative: '#F08A7E',
    negativeSoft: '#3E1A16',
    warning: '#F1C76A',
    warningSoft: '#3A2D10',
  },
  light: {
    background: '#FBF8F2',
    surface: '#FFFFFF',
    surfaceAlt: '#F3EEE3',
    border: '#E6DFD0',
    borderStrong: '#C9B77A',
    text: '#1C1812',
    textSecondary: '#6B6459',
    textTertiary: '#9A9286',
    accent: '#A67C00',
    accentSoft: '#F6EBC8',
    onAccent: '#FFFFFF',
    positive: '#1F7A4D',
    positiveSoft: '#DFF3E8',
    negative: '#B3261E',
    negativeSoft: '#F9DEDC',
    warning: '#8A5A00',
    warningSoft: '#FDEFD2',
  },
} as const;

export type Scheme = keyof typeof Palette;
export type Colors = (typeof Palette)[Scheme];
export type ColorName = keyof Colors;

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const Radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const MaxContentWidth = 760;
export const TabBarHeight = 72;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', mono: 'ui-monospace' },
  android: { sans: 'sans-serif', serif: 'serif', mono: 'monospace' },
  default: {
    sans: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: 'ui-monospace, Menlo, monospace',
  },
})!;
