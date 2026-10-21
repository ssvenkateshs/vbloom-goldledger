import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

interface ListRowProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  rightText?: string;
  rightTone?: 'default' | 'positive' | 'negative' | 'secondary';
  onPress?: () => void;
  badge?: string;
}

export function ListRow({ title, subtitle, right, rightText, rightTone = 'default', onPress, badge }: ListRowProps) {
  const theme = useTheme();
  const rightColor = { default: 'text', positive: 'positive', negative: 'negative', secondary: 'textSecondary' }[rightTone] as
    'text' | 'positive' | 'negative' | 'textSecondary';
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.surfaceAlt : theme.surface, borderColor: theme.border }]}>
      <View style={styles.main}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </AppText>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: theme.surfaceAlt }]}>
              <AppText variant="caption">{badge}</AppText>
            </View>
          ) : null}
        </View>
        {subtitle ? (
          <AppText variant="small" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {rightText ? (
        <AppText variant="bodyStrong" color={rightColor} style={styles.right}>
          {rightText}
        </AppText>
      ) : null}
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  main: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
  right: { textAlign: 'right' },
});
