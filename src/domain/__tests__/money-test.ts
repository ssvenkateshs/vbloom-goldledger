import { formatMoney, fromMajor, money, parseMoney, sumMoney, toMajor } from '../money';

describe('money', () => {
  test('major/minor conversion respects the currency exponent', () => {
    expect(fromMajor(1234.56, 'INR').amountMinor).toBe(123456);
    expect(fromMajor(1.234, 'KWD').amountMinor).toBe(1234);
    expect(fromMajor(1000, 'JPY').amountMinor).toBe(1000);
    expect(toMajor(money(123456, 'INR'))).toBe(1234.56);
  });

  test('rounds half away from zero', () => {
    expect(money(0.5, 'INR').amountMinor).toBe(1);
    expect(money(-0.5, 'INR').amountMinor).toBe(-1);
    expect(money(2.4999, 'INR').amountMinor).toBe(2);
  });

  test('parseMoney ignores currency symbols and separators', () => {
    expect(parseMoney('₹1,23,456.78', 'INR')?.amountMinor).toBe(12345678);
    expect(parseMoney('', 'INR')).toBeNull();
  });

  test('sum refuses mixed currencies', () => {
    expect(sumMoney([money(100, 'INR'), money(200, 'INR')], 'INR').amountMinor).toBe(300);
    expect(() => sumMoney([money(100, 'INR'), money(200, 'USD')], 'INR')).toThrow(/mismatch/);
  });

  test('formats with Intl', () => {
    expect(formatMoney(money(123456, 'USD'), 'en-US')).toBe('$1,234.56');
  });
});
