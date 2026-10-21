import { money, type CurrencyCode } from './money';
import type { FinenessPpt, Metal } from './purity';
import { MG_PER_UNIT, type WeightUnit } from './units';

/**
 * Metal rates.
 *
 * Canonical: price of one gram of 1000-fine metal in minor currency units
 * (`ratePerGramFineMinor`). Markets quote in many bases (₹ per 10 g of 22 K in
 * India, $ per troy ounce internationally, AED per gram of 24 K in the Gulf).
 * `quoteToCanonical` and `canonicalToQuote` convert between any such basis and
 * the canonical form so that two shops can exchange rates without ambiguity.
 */

export interface RateQuoteBasis {
  /** Quoted quantity, e.g. 10 for "per 10 g". */
  quantity: number;
  unit: WeightUnit;
  /** Fineness the quote refers to, e.g. 916 for a 22 K quote. */
  fineness: FinenessPpt;
}

export const RATE_BASES: Record<string, RateQuoteBasis & { label: string }> = {
  per_10g_22k: { quantity: 10, unit: 'g', fineness: 916, label: 'per 10 g, 22K' },
  per_10g_24k: { quantity: 10, unit: 'g', fineness: 999, label: 'per 10 g, 24K' },
  per_g_24k: { quantity: 1, unit: 'g', fineness: 999, label: 'per gram, 24K' },
  per_g_22k: { quantity: 1, unit: 'g', fineness: 916, label: 'per gram, 22K' },
  per_g_18k: { quantity: 1, unit: 'g', fineness: 750, label: 'per gram, 18K' },
  per_tola_24k: { quantity: 1, unit: 'tola', fineness: 999, label: 'per tola, 24K' },
  per_ozt_fine: { quantity: 1, unit: 'ozt', fineness: 1000, label: 'per troy ounce, fine' },
  per_kg_fine: { quantity: 1, unit: 'kg', fineness: 1000, label: 'per kg, fine' },
  per_g_925: { quantity: 1, unit: 'g', fineness: 925, label: 'per gram, 925' },
  per_kg_999: { quantity: 1, unit: 'kg', fineness: 999, label: 'per kg, 999' },
};

export type RateBasisKey = keyof typeof RATE_BASES;

export function isRateBasisKey(value: unknown): value is RateBasisKey {
  return typeof value === 'string' && value in RATE_BASES;
}

/** Default quoting convention per metal when nothing is configured. */
export const DEFAULT_RATE_BASIS: Record<Metal, RateBasisKey> = {
  gold: 'per_10g_22k',
  silver: 'per_kg_999',
  platinum: 'per_g_24k',
  palladium: 'per_g_24k',
};

/** Convert a market quote (minor units for `basis`) into the canonical per-gram-fine rate. */
export function quoteToCanonical(quoteMinor: number, basis: RateQuoteBasis): number {
  const grams = (basis.quantity * MG_PER_UNIT[basis.unit]) / 1000;
  const fineGrams = grams * (basis.fineness / 1000);
  if (fineGrams <= 0) throw new RangeError('Rate basis must describe a positive fine weight');
  return quoteMinor / fineGrams;
}

/** Express a canonical per-gram-fine rate in a given quote basis (minor units, rounded). */
export function canonicalToQuote(ratePerGramFineMinor: number, basis: RateQuoteBasis): number {
  const grams = (basis.quantity * MG_PER_UNIT[basis.unit]) / 1000;
  const fineGrams = grams * (basis.fineness / 1000);
  return Math.round(ratePerGramFineMinor * fineGrams);
}

export function formatRateInBasis(ratePerGramFineMinor: number, currency: CurrencyCode, basis: RateQuoteBasis) {
  return money(canonicalToQuote(ratePerGramFineMinor, basis), currency);
}
