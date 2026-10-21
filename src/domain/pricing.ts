import { fineWeightMg, type FinenessPpt } from './purity';
import { money, roundMinor, type CurrencyCode, type Money } from './money';
import type { WeightMg } from './units';

/**
 * Pricing engine for precious-metal jewellery.
 *
 * The formula is the one used across the trade, parameterised so that it fits
 * Indian, Gulf and Western conventions alike:
 *
 *   chargeable weight = net metal weight × (1 + wastage %)
 *   metal value       = chargeable weight × (fineness / 1000) × rate per gram of fine metal
 *   making charge     = per gram × net weight | % of metal value | flat
 *   subtotal          = metal value + making + stones + other
 *   taxable           = subtotal − discount
 *   tax               = taxable × tax %
 *   total             = taxable + tax
 *
 * Every monetary intermediate is rounded to integer minor units so the result is
 * reproducible on any device or server that reimplements this spec.
 */

export type MakingChargeType = 'per_gram' | 'percent' | 'flat';

export const MAKING_CHARGE_TYPES: readonly MakingChargeType[] = ['per_gram', 'percent', 'flat'];

export interface RateBasis {
  /** Price of one gram of 1000-fine metal, in minor currency units. */
  ratePerGramFineMinor: number;
  currency: CurrencyCode;
}

export interface PriceInput {
  netWeightMg: WeightMg;
  fineness: FinenessPpt;
  rate: RateBasis;
  /** Percentage added to the chargeable weight (0 if none). */
  wastagePercent?: number;
  makingChargeType?: MakingChargeType;
  /** per_gram: minor units per gram; percent: percentage of metal value; flat: minor units. */
  makingChargeValue?: number;
  stoneChargeMinor?: number;
  otherChargeMinor?: number;
  discountMinor?: number;
  taxPercent?: number;
}

export interface PriceBreakdown {
  currency: CurrencyCode;
  chargeableWeightMg: number;
  fineWeightMg: number;
  metalValue: Money;
  makingCharge: Money;
  stoneCharge: Money;
  otherCharge: Money;
  subtotal: Money;
  discount: Money;
  taxable: Money;
  tax: Money;
  total: Money;
}

function nonNegative(value: number | undefined, name: string): number {
  const v = value ?? 0;
  if (!Number.isFinite(v) || v < 0) throw new RangeError(`${name} must be a non-negative number`);
  return v;
}

export function priceItem(input: PriceInput): PriceBreakdown {
  const currency = input.rate.currency;
  const net = nonNegative(input.netWeightMg, 'netWeightMg');
  const wastage = nonNegative(input.wastagePercent, 'wastagePercent');
  const chargeableWeightMg = net * (1 + wastage / 100);
  const fine = fineWeightMg(chargeableWeightMg, input.fineness);

  const ratePerMgFine = nonNegative(input.rate.ratePerGramFineMinor, 'ratePerGramFineMinor') / 1000;
  const metalValue = money(fine * ratePerMgFine, currency);

  const makingType = input.makingChargeType ?? 'flat';
  const makingValue = nonNegative(input.makingChargeValue, 'makingChargeValue');
  let makingMinor: number;
  switch (makingType) {
    case 'per_gram':
      makingMinor = (net / 1000) * makingValue;
      break;
    case 'percent':
      makingMinor = metalValue.amountMinor * (makingValue / 100);
      break;
    case 'flat':
      makingMinor = makingValue;
      break;
  }
  const makingCharge = money(makingMinor, currency);
  const stoneCharge = money(nonNegative(input.stoneChargeMinor, 'stoneChargeMinor'), currency);
  const otherCharge = money(nonNegative(input.otherChargeMinor, 'otherChargeMinor'), currency);

  const subtotalMinor = metalValue.amountMinor + makingCharge.amountMinor + stoneCharge.amountMinor + otherCharge.amountMinor;
  const discountMinor = Math.min(nonNegative(input.discountMinor, 'discountMinor'), subtotalMinor);
  const taxableMinor = subtotalMinor - discountMinor;
  const taxMinor = roundMinor(taxableMinor * (nonNegative(input.taxPercent, 'taxPercent') / 100));

  return {
    currency,
    chargeableWeightMg,
    fineWeightMg: fine,
    metalValue,
    makingCharge,
    stoneCharge,
    otherCharge,
    subtotal: money(subtotalMinor, currency),
    discount: money(discountMinor, currency),
    taxable: money(taxableMinor, currency),
    tax: money(taxMinor, currency),
    total: money(taxableMinor + taxMinor, currency),
  };
}

/**
 * Value of scrap or old gold bought from a customer: fine weight × rate, less an
 * optional deduction percentage for refining/melting loss.
 */
export function valueOldMetal(input: { netWeightMg: WeightMg; fineness: FinenessPpt; rate: RateBasis; deductionPercent?: number }): Money {
  const fine = fineWeightMg(nonNegative(input.netWeightMg, 'netWeightMg'), input.fineness);
  const gross = fine * (input.rate.ratePerGramFineMinor / 1000);
  const deduction = nonNegative(input.deductionPercent, 'deductionPercent');
  return money(gross * (1 - deduction / 100), input.rate.currency);
}
