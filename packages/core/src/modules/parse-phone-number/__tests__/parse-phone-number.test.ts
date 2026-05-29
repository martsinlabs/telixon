import { describe, expect, it } from 'vitest';
import { parsePhoneNumber } from '../parse-phone-number';

describe('parsePhoneNumber: international', () => {
  it('parses a formatted +E.164 number', () => {
    const phone = parsePhoneNumber('+1 (212) 555-1234');

    expect(phone.isValid()).toBe(true);
    expect(phone.getCountry()).toBe('US');
    expect(phone.getCallingCode()).toBe('1');
    expect(phone.getNationalNumber()).toBe('2125551234');
    expect(phone.getE164()).toBe('+12125551234');
  });

  it('infers the calling code when the + is missing', () => {
    const phone = parsePhoneNumber('12125551234');

    expect(phone.getCountry()).toBe('US');
    expect(phone.getE164()).toBe('+12125551234');
  });

  it('takes the calling code from the + prefix over defaultCountry', () => {
    const phone = parsePhoneNumber('+442079460958', { defaultCountry: 'US' });

    expect(phone.getCountry()).toBe('GB');
    expect(phone.getE164()).toBe('+442079460958');
  });

  it('formats a possible-but-invalid number instead of failing', () => {
    const phone = parsePhoneNumber('+13101234434');

    expect(phone.isPossible()).toBe(true);
    expect(phone.isValid()).toBe(false);
    expect(phone.getE164()).toBe('+13101234434');
  });
});

describe('parsePhoneNumber: national', () => {
  it('reads a national number for the default country', () => {
    const phone = parsePhoneNumber('(212) 555-1234', { defaultCountry: 'US' });

    expect(phone.getCountry()).toBe('US');
    expect(phone.getNationalNumber()).toBe('2125551234');
    expect(phone.getE164()).toBe('+12125551234');
  });

  it('strips the national prefix using the default country', () => {
    const phone = parsePhoneNumber('020 7946 0958', { defaultCountry: 'GB' });

    expect(phone.getCountry()).toBe('GB');
    expect(phone.getNationalNumber()).toBe('2079460958');
    expect(phone.getE164()).toBe('+442079460958');
  });
});

describe('parsePhoneNumber: unresolvable input', () => {
  it('returns an empty PhoneNumber for a blank string', () => {
    const phone = parsePhoneNumber('');

    expect(phone.isPossible()).toBe(false);
    expect(phone.getCountry()).toBeNull();
    expect(phone.getNationalNumber()).toBe('');
    expect(phone.getE164()).toBeNull();
  });
});
