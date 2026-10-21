import { fineWeightMg, finenessToKarat, formatPurity, karatToFineness } from '../purity';

describe('purity', () => {
  test('22K maps to 916 as hallmarked, 18K to 750, 24K to 999 floor', () => {
    expect(karatToFineness(22)).toBe(916);
    expect(karatToFineness(18)).toBe(750);
    expect(karatToFineness(14)).toBe(583);
    expect(karatToFineness(24)).toBe(1000);
  });

  test('fineness to karat', () => {
    expect(finenessToKarat(750)).toBe(18);
    expect(finenessToKarat(916)).toBeCloseTo(21.98, 2);
  });

  test('labels', () => {
    expect(formatPurity('gold', 916)).toBe('22K (916)');
    expect(formatPurity('gold', 750)).toBe('18K (750)');
    expect(formatPurity('silver', 925)).toBe('925');
  });

  test('fine weight', () => {
    expect(fineWeightMg(10000, 916)).toBe(9160);
  });
});
