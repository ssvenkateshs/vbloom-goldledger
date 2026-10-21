import { formatWeight, fromMg, parseWeight, toMg } from '../units';

describe('weights', () => {
  test('grams round-trip through milligrams', () => {
    expect(toMg(12.345, 'g')).toBe(12345);
    expect(fromMg(12345, 'g')).toBeCloseTo(12.345, 6);
  });

  test('tola and troy ounce use international definitions', () => {
    expect(toMg(1, 'tola')).toBe(11664);
    expect(toMg(1, 'ozt')).toBe(31103);
    expect(toMg(1, 'ct')).toBe(200);
  });

  test('parseWeight tolerates thousands separators and rejects junk', () => {
    expect(parseWeight('1,234.5', 'g')).toBe(1234500);
    expect(parseWeight('abc', 'g')).toBeNull();
    expect(parseWeight('-1', 'g')).toBeNull();
    expect(parseWeight('', 'g')).toBeNull();
  });

  test('formatWeight uses unit-appropriate decimals', () => {
    expect(formatWeight(12345, 'g', 'en-US')).toBe('12.345 g');
    expect(formatWeight(12345, 'g', 'en-US', { withUnit: false })).toBe('12.345');
  });
});
