import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Gold, Radius } from '@/theme';

interface GoldGradientProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  /** `soft` is the dark, barely-there gradient used behind secondary surfaces. */
  variant?: 'gold' | 'soft';
}

/** The signature gold surface: a diagonal gradient from pale to deep gold. */
export function GoldGradient({ children, style, variant = 'gold' }: GoldGradientProps) {
  return (
    <LinearGradient
      colors={variant === 'gold' ? [...Gold.gradient] : [...Gold.gradientSoft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.base, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({ base: { borderRadius: Radius.lg, overflow: 'hidden' } });
