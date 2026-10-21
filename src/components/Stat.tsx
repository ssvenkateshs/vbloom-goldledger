import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

export function Stat({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'default' | 'positive' | 'negative';
}) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <AppText variant="label">{label}</AppText>
      <AppText
        variant="title"
        color={tone === 'positive' ? 'positive' : tone === 'negative' ? 'negative' : 'text'}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {value}
      </AppText>
      {detail ? <AppText variant="caption">{detail}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, minWidth: 140, padding: Spacing.md, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
});
