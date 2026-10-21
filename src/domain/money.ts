/**
 * Money handling.
 *
 * Canonical representation: `{ amountMinor, currency }` where `amountMinor` is an
 * integer count of the currency's minor unit (paise, cents, fils ...) and `currency`
 * is an ISO 4217 alphabetic code. Floating point is only ever used transiently
 * inside a calculation and rounded back to integer minor units at every line.
 */

export type CurrencyCode = string; // ISO 4217 alphabetic, e.g. "INR", "USD", "AED"

export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

/** Minor unit exponent for currencies that are not 2-decimal (ISO 4217). */
const MINOR_UNIT_EXPONENT: Record<string, number> = {
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
  JPY: 0,
  KRW: 0,
  VND: 0,
  CLP: 0,
  ISK: 0,
  UGX: 0,
  XAF: 0,
  XOF: 0,
};

export function minorUnitExponent(currency: CurrencyCode): number {
  return MINOR_UNIT_EXPONENT[currency.toUpperCase()] ?? 2;
}

export function minorUnitsPerMajor(currency: CurrencyCode): number {
  return 10 ** minorUnitExponent(currency);
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

/** Round half away from zero to an integer. */
export function roundMinor(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Amount must be finite');
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function money(amountMinor: number, currency: CurrencyCode): Money {
  return { amountMinor: roundMinor(amountMinor), currency };
}

export function fromMajor(amountMajor: number, currency: CurrencyCode): Money {
  return money(amountMajor * minorUnitsPerMajor(currency), currency);
}

export function toMajor(m: Money): number {
  return m.amountMinor / minorUnitsPerMajor(m.currency);
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

export function sumMoney(items: readonly Money[], currency: CurrencyCode): Money {
  return items.reduce((acc, m) => addMoney(acc, m), money(0, currency));
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

/** Parse user-entered text like "1,234.50" into minor units, or null if invalid. */
export function parseMoney(text: string, currency: CurrencyCode): Money | null {
  const cleaned = text.replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '.' || cleaned === '-') return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return fromMajor(n, currency);
}

export function formatMoney(m: Money, locale?: string, options?: { compact?: boolean }): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: m.currency,
      notation: options?.compact ? 'compact' : 'standard',
      maximumFractionDigits: options?.compact ? 1 : undefined,
    }).format(toMajor(m));
  } catch {
    return `${m.currency} ${toMajor(m).toFixed(minorUnitExponent(m.currency))}`;
  }
}
