import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

interface ToggleGroupProps<T extends string> {
  label?: string;
  options: readonly { value: T; label: string }[];
  values: readonly T[];
  onChange: (values: T[]) => void;
}

/** Multi-select toggle chips. */
export function ToggleGroup<T extends string>({ label, options, values, onChange }: ToggleGroupProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View style={styles.row}>
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <Pressable
              key={o.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
              style={[styles.chip, { backgroundColor: on ? theme.accent : theme.surfaceAlt, borderColor: on ? theme.accent : theme.border }]}>
              <AppText variant="small" style={{ color: on ? theme.onAccent : theme.text, fontWeight: on ? '600' : '400' }}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingVertical: 6, paddingHorizontal: Spacing.md, borderRadius: Radius.pill, borderWidth: 1 },
});
