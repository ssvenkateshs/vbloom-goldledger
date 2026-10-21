import { priceItem, valueOldMetal } from '../pricing';
import { canonicalToQuote, quoteToCanonical, RATE_BASES } from '../rates';

const rate = { ratePerGramFineMinor: 700000, currency: 'INR' }; // ₹7,000 per gram fine

describe('priceItem', () => {
  test('a 10 g 22K ring: metal value + per-gram making + 3% GST', () => {
    const p = priceItem({
      netWeightMg: 10000,
      fineness: 916,
      rate,
      makingChargeType: 'per_gram',
      makingChargeValue: 50000, // ₹500/g
      taxPercent: 3,
    });
    expect(p.metalValue.amountMinor).toBe(6412000); // 10 × 0.916 × 7000 = ₹64,120
    expect(p.makingCharge.amountMinor).toBe(500000);
    expect(p.subtotal.amountMinor).toBe(6912000);
    expect(p.tax.amountMinor).toBe(207360);
    expect(p.total.amountMinor).toBe(7119360);
  });

  test('wastage inflates the chargeable weight, percent making applies to metal value', () => {
    const p = priceItem({
      netWeightMg: 10000,
      fineness: 916,
      rate,
      wastagePercent: 8,
      makingChargeType: 'percent',
      makingChargeValue: 10,
    });
    expect(p.chargeableWeightMg).toBeCloseTo(10800, 6);
    expect(p.metalValue.amountMinor).toBe(6924960);
    expect(p.makingCharge.amountMinor).toBe(692496);
    expect(p.tax.amountMinor).toBe(0);
  });

  test('discount is capped at the subtotal and applied before tax', () => {
    const p = priceItem({
      netWeightMg: 1000,
      fineness: 1000,
      rate,
      discountMinor: 99999999,
      taxPercent: 3,
    });
    expect(p.discount.amountMinor).toBe(700000);
    expect(p.total.amountMinor).toBe(0);
  });

  test('rejects negative inputs', () => {
    expect(() => priceItem({ netWeightMg: -1, fineness: 916, rate })).toThrow(RangeError);
  });

  test('old gold valuation with deduction', () => {
    const v = valueOldMetal({ netWeightMg: 10000, fineness: 916, rate, deductionPercent: 2 });
    expect(v.amountMinor).toBe(6283760);
  });
});

describe('rate bases', () => {
  test('₹ per 10 g of 22K converts to and from per-gram-fine', () => {
    const basis = RATE_BASES.per_10g_22k;
    const canonical = quoteToCanonical(6412000, basis); // ₹64,120 per 10 g 22K
    expect(canonical).toBeCloseTo(700000, 6);
    expect(canonicalToQuote(canonical, basis)).toBe(6412000);
  });

  test('USD per troy ounce', () => {
    const basis = RATE_BASES.per_ozt_fine;
    const canonical = quoteToCanonical(250000, basis); // $2,500/oz t
    expect(canonical).toBeCloseTo(250000 / 31.1034768, 6);
  });
});
