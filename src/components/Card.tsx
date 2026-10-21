import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';
import { GoldGradient } from './GoldGradient';

interface CardProps extends PropsWithChildren<ViewProps> {
  title?: string;
  /** `gold` renders on the gold gradient with dark text; `accent` is a dark card with a gold edge. */
  tone?: 'default' | 'accent' | 'gold';
}

export function Card({ title, tone = 'default', style, children, ...rest }: CardProps) {
  const theme = useTheme();
  if (tone === 'gold') {
    return (
      <GoldGradient style={[styles.card, { borderWidth: 0 }, style]}>
        {title ? (
          <AppText variant="label" style={[styles.title, { color: '#5A4610' }]}>
            {title}
          </AppText>
        ) : null}
        <View {...rest} style={{ gap: Spacing.sm }}>
          {children}
        </View>
      </GoldGradient>
    );
  }
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tone === 'accent' ? theme.accentSoft : theme.surface, borderColor: tone === 'accent' ? theme.borderStrong : theme.border },
        style,
      ]}
      {...rest}>
      {title ? (
        <AppText variant="label" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  title: { marginBottom: Spacing.xs },
});
