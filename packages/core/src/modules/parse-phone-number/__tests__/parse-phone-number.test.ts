import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { parsePhoneNumber } from '../parse-phone-number';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_MOBILE_INTL = '1' + US_MOBILE;
const US_MOBILE_E164 = '+1' + US_MOBILE;
const US_MOBILE_NATIONAL = '(201) 555-0123';
const GB_FIXED = getExampleNumber('GB', 'FIXED_LINE');
const GB_FIXED_E164 = '+44' + GB_FIXED;
const GB_FIXED_NATIONAL = '0121 234 5678';

describe('parsePhoneNumber: international', () => {
  it('parses a formatted +E.164 number', () => {
    const phone = parsePhoneNumber('+1 ' + US_MOBILE_NATIONAL);

    expect(phone.isValid()).toBe(true);
    expect(phone.getRegion()).toBe('US');
    expect(phone.getCallingCode()).toBe('1');
    expect(phone.getNationalNumber()).toBe(US_MOBILE);
    expect(phone.formatE164()).toBe(US_MOBILE_E164);
  });

  it('infers the calling code when the + is missing', () => {
    const phone = parsePhoneNumber(US_MOBILE_INTL);

    expect(phone.getRegion()).toBe('US');
    expect(phone.formatE164()).toBe(US_MOBILE_E164);
  });

  it('takes the calling code from the + prefix over defaultRegion', () => {
    const phone = parsePhoneNumber(GB_FIXED_E164, { defaultRegion: 'US' });

    expect(phone.getRegion()).toBe('GB');
    expect(phone.formatE164()).toBe(GB_FIXED_E164);
  });

  it('formats a possible-but-invalid number instead of failing', () => {
    const phone = parsePhoneNumber('+13101234434');

    expect(phone.isPossible()).toBe(true);
    expect(phone.isValid()).toBe(false);
    expect(phone.formatE164()).toBe('+13101234434');
  });
});

describe('parsePhoneNumber: national', () => {
  it('reads a national number for the default region', () => {
    const phone = parsePhoneNumber(US_MOBILE_NATIONAL, { defaultRegion: 'US' });

    expect(phone.getRegion()).toBe('US');
    expect(phone.getNationalNumber()).toBe(US_MOBILE);
    expect(phone.formatE164()).toBe(US_MOBILE_E164);
  });

  it('strips the national prefix using the default region', () => {
    const phone = parsePhoneNumber(GB_FIXED_NATIONAL, { defaultRegion: 'GB' });

    expect(phone.getRegion()).toBe('GB');
    expect(phone.getNationalNumber()).toBe(GB_FIXED);
    expect(phone.formatE164()).toBe(GB_FIXED_E164);
  });
});

describe('parsePhoneNumber: unresolvable input', () => {
  it('returns an empty PhoneNumber for a blank string', () => {
    const phone = parsePhoneNumber('');

    expect(phone.isPossible()).toBe(false);
    expect(phone.getRegion()).toBeNull();
    expect(phone.getNationalNumber()).toBe('');
    expect(phone.formatE164()).toBeNull();
  });
});
