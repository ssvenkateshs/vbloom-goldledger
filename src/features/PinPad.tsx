import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '@/components';
import { PIN_LENGTH } from '@/services/pin';
import { Gold, Radius, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

interface PinPadProps {
  title: string;
  subtitle?: string;
  error?: string | null;
  onComplete: (pin: string) => void | Promise<void>;
}

/** Remount (change `key`) to clear the entered digits. */
export function PinPad({ title, subtitle, error, onComplete }: PinPadProps) {
  const theme = useTheme();
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      const value = pin;
      const t = setTimeout(() => {
        onComplete(value);
      }, 120);
      return () => clearTimeout(t);
    }
  }, [pin, onComplete]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <View style={styles.wrap}>
      <AppText variant="heading" style={{ textAlign: 'center', color: Gold.bright }}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="small" color="textSecondary" style={{ textAlign: 'center' }}>
          {subtitle}
        </AppText>
      ) : null}
      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.dot, { borderColor: Gold.base, backgroundColor: i < pin.length ? Gold.base : 'transparent' }]} />
        ))}
      </View>
      <AppText variant="small" color="negative" style={{ textAlign: 'center', minHeight: 20 }}>
        {error ?? ''}
      </AppText>
      <View style={styles.grid}>
        {keys.map((k, i) => (
          <Pressable
            key={i}
            disabled={k === ''}
            accessibilityRole="button"
            accessibilityLabel={k === '⌫' ? 'Delete' : k}
            onPress={() => setPin((p) => (k === '⌫' ? p.slice(0, -1) : p.length < PIN_LENGTH ? p + k : p))}
            style={({ pressed }) => [
              styles.key,
              {
                backgroundColor: k === '' ? 'transparent' : pressed ? theme.surfaceAlt : theme.surface,
                borderColor: k === '' ? 'transparent' : theme.border,
              },
            ]}>
            {k === '⌫' ? <Icon name="backspace-outline" size={22} color={theme.text} /> : <AppText variant="heading">{k}</AppText>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: Spacing.md, width: '100%' },
  dots: { flexDirection: 'row', gap: Spacing.lg, marginVertical: Spacing.md },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 3 * 84 + 2 * Spacing.md, gap: Spacing.md, justifyContent: 'center' },
  key: { width: 84, height: 64, borderRadius: Radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
