import { Field } from './Field';

interface NumberFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suffix?: string;
  hint?: string;
  error?: string | null;
  placeholder?: string;
}

/** Decimal input that keeps its text state (so "12." can be typed) and parses on save. */
export function NumberField({ label, value, onChangeText, suffix, hint, error, placeholder }: NumberFieldProps) {
  return (
    <Field
      label={label}
      value={value}
      onChangeText={(t) => onChangeText(t.replace(/[^\d.]/g, ''))}
      keyboardType="decimal-pad"
      inputMode="decimal"
      suffix={suffix}
      hint={hint}
      error={error}
      placeholder={placeholder ?? '0'}
    />
  );
}

export function numberOrZero(text: string): number {
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}
