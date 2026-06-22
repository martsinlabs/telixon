import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { parsePhoneNumber } from '../../parse-phone-number';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const CA_MOBILE = getExampleNumber('CA', 'MOBILE');
const GB_FIXED = getExampleNumber('GB', 'FIXED_LINE');

describe('PhoneNumber.isValidForCountry (libphonenumber isValidNumberForRegion)', () => {
  it('is true for the number own country, false for a sibling sharing the calling code', () => {
    const us = parsePhoneNumber('+1' + US_MOBILE);
    expect(us.isValidForCountry('US')).toBe(true);
    expect(us.isValidForCountry('CA')).toBe(false);

    const ca = parsePhoneNumber('+1' + CA_MOBILE);
    expect(ca.isValidForCountry('CA')).toBe(true);
    expect(ca.isValidForCountry('US')).toBe(false);
  });

  it('is false when the country calling code does not match the number', () => {
    const gb = parsePhoneNumber('+44' + GB_FIXED);
    expect(gb.isValidForCountry('GB')).toBe(true);
    expect(gb.isValidForCountry('US')).toBe(false);
  });
});
