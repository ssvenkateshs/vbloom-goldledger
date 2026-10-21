import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { Gold, Radius, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'md' | 'sm' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  icon?: IconName;
}

export function Button({ title, variant = 'primary', size = 'md', loading, disabled, fullWidth, icon, ...rest }: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const color = {
    primary: Gold.onGold,
    secondary: theme.text,
    outline: theme.accent,
    ghost: theme.accent,
    danger: theme.negative,
  }[variant];
  const background = {
    primary: 'transparent',
    secondary: theme.surfaceAlt,
    outline: 'transparent',
    ghost: 'transparent',
    danger: theme.negativeSoft,
  }[variant];
  const borderColor = variant === 'outline' ? theme.borderStrong : 'transparent';
  const padding = size === 'sm' ? styles.small : size === 'lg' ? styles.large : styles.medium;
  const iconSize = size === 'sm' ? 14 : 18;

  const content = (
    <View style={[styles.inner, padding]}>
      {loading ? <ActivityIndicator color={color} size="small" /> : icon ? <Icon name={icon} size={iconSize} color={color} /> : null}
      <AppText
        variant={size === 'sm' ? 'small' : 'bodyStrong'}
        style={[{ color, fontWeight: '700' }, variant === 'primary' && size !== 'sm' && styles.primaryText]}>
        {title}
      </AppText>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled) }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background, borderColor, opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1 },
        fullWidth && { alignSelf: 'stretch' },
      ]}
      {...rest}>
      {variant === 'primary' ? (
        <LinearGradient colors={[...Gold.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: Radius.md, alignSelf: 'flex-start', overflow: 'hidden', borderWidth: 1 },
  gradient: { borderRadius: Radius.md },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  small: { paddingVertical: 7, paddingHorizontal: Spacing.md },
  medium: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  large: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl },
  primaryText: { textTransform: 'uppercase', letterSpacing: 1.2, fontSize: 14 },
});
