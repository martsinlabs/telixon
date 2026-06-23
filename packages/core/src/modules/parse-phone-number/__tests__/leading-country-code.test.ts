import { describe, expect, it } from 'vitest';
import { parsePhoneNumber } from '..';

describe('parsePhoneNumber: leading country code (libphonenumber maybeExtractCountryCode FROM_NUMBER)', () => {
  it('drops a redundant leading country code when the full number is too long', () => {
    // RU national input dialled with its own country code: "7" + "8001234567".
    const number = parsePhoneNumber('78001234567', { defaultCountry: 'RU' });

    expect(number.getCountry()).toBe('RU');
    expect(number.getNationalNumber()).toBe('8001234567');
  });

  it('strips the national prefix from the remainder with no length guard', () => {
    // "1" (country code) + "1" (trunk prefix) + a short number: both leading ones drop.
    const number = parsePhoneNumber('11660318596', { defaultCountry: 'US' });

    expect(number.getNationalNumber()).toBe('660318596');
    expect(number.isPossibleWithReason()).toBe('TOO_SHORT');
  });

  it('keeps the country code on the resolved number while dropping it from the national part', () => {
    const number = parsePhoneNumber('2422123456', { defaultCountry: 'CG' });

    expect(number.getCallingCode()).toBe('242');
    expect(number.getNationalNumber()).toBe('2123456');
  });
});

describe('parsePhoneNumber: incomplete international calling code', () => {
  it('rejects a + number whose calling code never completes', () => {
    // 420/421/423 exist, but "42" alone is not a calling code.
    const number = parsePhoneNumber('+42690123456');

    expect(number.isPossible()).toBe(false);
    expect(number.isPossibleWithReason()).toBe('INVALID_COUNTRY_CODE');
  });

  it('does not recover a different calling code by dropping a stray digit', () => {
    // A KH number with a 0 inserted: must not silently parse as +855.
    const number = parsePhoneNumber('+805523756789');

    expect(number.isPossible()).toBe(false);
  });
});
