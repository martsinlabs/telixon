import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { parsePhoneNumber } from '../parse-phone-number';

// NANP (+1) shares one calling code across the US, Canada, and the Caribbean, so the region is decided by the number, not defaultCountry.
const US_MOBILE = getExampleNumber('US', 'MOBILE');
const CA_FIXED = getExampleNumber('CA', 'FIXED_LINE');
const BS_FIXED = getExampleNumber('BS', 'FIXED_LINE');
const CA_UAN = getExampleNumber('CA', 'UAN');

// +7 (Russia / Kazakhstan) and +44 (Great Britain / its crown dependencies) share a calling code too; the region splits on leading digits.
const RU_MOBILE_E164 = '+7' + getExampleNumber('RU', 'MOBILE');
const KZ_MOBILE_E164 = '+7' + getExampleNumber('KZ', 'MOBILE');
const JE_FIXED_E164 = '+44' + getExampleNumber('JE', 'FIXED_LINE');
const GG_FIXED_E164 = '+44' + getExampleNumber('GG', 'FIXED_LINE');
const IM_FIXED_E164 = '+44' + getExampleNumber('IM', 'FIXED_LINE');

// Argentine mobile carries the "9" indicator; Italian fixed-line keeps its leading zero in the national number.
const AR_MOBILE_E164 = '+54' + getExampleNumber('AR', 'MOBILE');
const IT_FIXED = getExampleNumber('IT', 'FIXED_LINE');
const IT_FIXED_E164 = '+39' + IT_FIXED;

describe('selection: region under a shared calling code', () => {
  it('resolves a US number to US even when defaultCountry is CA', () => {
    expect(parsePhoneNumber(US_MOBILE, { defaultCountry: 'CA' }).getCountry()).toBe('US');
  });

  it('resolves a CA number to CA even when defaultCountry is US', () => {
    expect(parsePhoneNumber(CA_FIXED, { defaultCountry: 'US' }).getCountry()).toBe('CA');
  });

  it('resolves a Bahamas number to BS under defaultCountry US', () => {
    expect(parsePhoneNumber(BS_FIXED, { defaultCountry: 'US' }).getCountry()).toBe('BS');
  });

  it('disambiguates Russia and Kazakhstan under +7', () => {
    expect(parsePhoneNumber(RU_MOBILE_E164).getCountry()).toBe('RU');
    expect(parsePhoneNumber(KZ_MOBILE_E164).getCountry()).toBe('KZ');
  });

  it('disambiguates the +44 crown dependencies from Great Britain', () => {
    expect(parsePhoneNumber(JE_FIXED_E164).getCountry()).toBe('JE');
    expect(parsePhoneNumber(GG_FIXED_E164).getCountry()).toBe('GG');
    expect(parsePhoneNumber(IM_FIXED_E164).getCountry()).toBe('IM');
  });
});

describe('selection: number type', () => {
  it('types a Canadian UAN as UAN, not a geographic number', () => {
    const phone = parsePhoneNumber(CA_UAN, { defaultCountry: 'CA' });

    expect(phone.getCountry()).toBe('CA');
    expect(phone.getNumberType()).toBe('UAN');
    expect(phone.isValid()).toBe(true);
  });

  it('types an Argentine mobile as MOBILE', () => {
    const phone = parsePhoneNumber(AR_MOBILE_E164);

    expect(phone.getCountry()).toBe('AR');
    expect(phone.getNumberType()).toBe('MOBILE');
  });
});

describe('selection: edge cases', () => {
  it('resolves a possible-but-not-valid NANP number to no specific region', () => {
    const phone = parsePhoneNumber('3101434444', { defaultCountry: 'CA' });

    expect(phone.isPossible()).toBe(true);
    expect(phone.isValid()).toBe(false);
    expect(phone.getCountry()).toBeNull();
  });

  it('keeps the Italian leading zero in the national number', () => {
    const phone = parsePhoneNumber(IT_FIXED_E164);

    expect(phone.getCountry()).toBe('IT');
    expect(phone.getNationalNumber()).toBe(IT_FIXED);
  });
});
