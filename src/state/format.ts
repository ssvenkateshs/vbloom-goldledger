import { useCallback, useMemo } from 'react';

import {
  DEFAULT_RATE_BASIS,
  RATE_BASES,
  formatMoney,
  formatRateInBasis,
  formatWeight,
  isRateBasisKey,
  type Metal,
  type Money,
  type WeightMg,
} from '@/domain';

import { useSettings } from './settings';

/** Locale- and settings-aware formatters for screens. */
export function useFormat() {
  const { settings } = useSettings();
  const { locale, currency, weightUnit } = settings;

  const money = useCallback(
    (amountMinor: number, options?: { compact?: boolean }) => formatMoney({ amountMinor, currency }, locale, options),
    [currency, locale],
  );
  const moneyOf = useCallback((m: Money) => formatMoney(m, locale), [locale]);
  const weight = useCallback((mg: WeightMg, opts?: { withUnit?: boolean }) => formatWeight(mg, weightUnit, locale, opts), [weightUnit, locale]);
  const fineWeight = useCallback((mg: WeightMg) => formatWeight(mg, 'g', locale), [locale]);

  const date = useCallback(
    (iso: string, style: 'short' | 'long' = 'short') => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat(locale, style === 'short' ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    },
    [locale],
  );

  const rateBasisFor = useCallback(
    (metal: Metal) => {
      const key = metal === 'gold' ? settings.goldRateBasis : metal === 'silver' ? settings.silverRateBasis : DEFAULT_RATE_BASIS[metal];
      return isRateBasisKey(key) ? RATE_BASES[key] : RATE_BASES[DEFAULT_RATE_BASIS[metal]];
    },
    [settings.goldRateBasis, settings.silverRateBasis],
  );

  const rate = useCallback(
    (metal: Metal, ratePerGramFineMinor: number) => {
      const basis = rateBasisFor(metal);
      return `${formatMoney(formatRateInBasis(ratePerGramFineMinor, currency, basis), locale)} ${basis.label}`;
    },
    [currency, locale, rateBasisFor],
  );

  return useMemo(
    () => ({ money, moneyOf, weight, fineWeight, date, rate, rateBasisFor, currency, locale, weightUnit }),
    [money, moneyOf, weight, fineWeight, date, rate, rateBasisFor, currency, locale, weightUnit],
  );
}
