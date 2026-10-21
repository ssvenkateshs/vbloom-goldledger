import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Radius, Spacing } from '@/theme';
import { useTheme } from '@/theme/use-theme';

import { AppText } from './AppText';

interface FieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string | null;
  suffix?: string;
}

export function Field({ label, hint, error, suffix, style, ...rest }: FieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <AppText variant="label">{label}</AppText>
      <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: error ? theme.negative : theme.border }]}>
        <TextInput
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.text }, style]}
          accessibilityLabel={label}
          {...rest}
        />
        {suffix ? (
          <AppText variant="small" color="textSecondary" style={styles.suffix}>
            {suffix}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color="negative">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.md },
  input: { flex: 1, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, fontSize: 16, minHeight: 46 },
  suffix: { paddingRight: Spacing.md },
});
