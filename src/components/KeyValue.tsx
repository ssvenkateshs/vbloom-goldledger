import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

interface KeyValueProps {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'default' | 'positive' | 'negative';
}

export function KeyValue({ label, value, strong, tone = 'default' }: KeyValueProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <AppText variant="small" color="textSecondary" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText
        variant={strong ? 'bodyStrong' : 'small'}
        color={tone === 'positive' ? 'positive' : tone === 'negative' ? 'negative' : 'text'}
        style={{ textAlign: 'right', flexShrink: 1 }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
