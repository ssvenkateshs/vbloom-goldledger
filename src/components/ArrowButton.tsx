import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { Gold, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

/** The round gold "proceed" control from the reference screens, with an optional label beside it. */
export function ArrowButton({ label, onPress, disabled }: { label?: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? 'Continue'}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.row, { opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }]}>
      {label ? (
        <AppText variant="bodyStrong" style={{ color: theme.text }}>
          {label}
        </AppText>
      ) : null}
      <LinearGradient colors={[...Gold.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.circle}>
        <View>
          <Icon name="arrow-right" size={24} color={Gold.onGold} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, alignSelf: 'flex-end' },
  circle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
