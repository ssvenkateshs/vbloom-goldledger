import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipsProps<T extends string> {
  label?: string;
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Single-select, horizontally scrolling chip row. */
export function Chips<T extends string>({ label, options, value, onChange }: ChipsProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(o.value)}
              style={[
                styles.chip,
                { backgroundColor: selected ? theme.accent : theme.surfaceAlt, borderColor: selected ? theme.accent : theme.border },
              ]}>
              <AppText variant="small" style={{ color: selected ? theme.onAccent : theme.text, fontWeight: selected ? '600' : '400' }}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  row: { gap: Spacing.sm, paddingVertical: 2 },
  chip: { paddingVertical: 6, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, borderWidth: 1 },
});
