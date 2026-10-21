import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ColorName } from '@/theme';
import { useTheme } from '@/theme/use-theme';

export type TextVariant = 'body' | 'bodyStrong' | 'small' | 'caption' | 'title' | 'heading' | 'display' | 'mono' | 'label';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: ColorName;
}

export function AppText({ variant = 'body', color, style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const defaultColor: ColorName = variant === 'caption' || variant === 'label' ? 'textSecondary' : 'text';
  return <Text style={[{ color: theme[color ?? defaultColor] }, styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  heading: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' },
  mono: { fontSize: 14, lineHeight: 20, fontFamily: Fonts.mono },
});
