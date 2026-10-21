import { Pressable, StyleSheet, View } from 'react-native';

import { Gold, Radius, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

/** The square action tiles from the reference home screen. */
export function Tile({ icon, title, subtitle, onPress }: { icon: IconName; title: string; subtitle?: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? theme.surfaceAlt : theme.surface, borderColor: theme.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.accentSoft }]}>
        <Icon name={icon} size={26} color={Gold.bright} />
      </View>
      <View style={{ gap: 2 }}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 150, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.lg },
  iconWrap: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
