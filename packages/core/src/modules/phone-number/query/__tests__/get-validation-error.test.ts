import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../../../input-controller/international-input-controller';
import { parsePhoneNumber } from '../../../parse-phone-number';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const AE_MOBILE = getExampleNumber('AE', 'MOBILE');
const AE_MOBILE_WITH_PREFIX = '0' + AE_MOBILE;

describe('PhoneNumber.getValidationError', () => {
  it('returns null for a fully valid number', () => {
    expect(parsePhoneNumber('+1 ' + US_MOBILE).getValidationError()).toBeNull();
  });

  it('returns EMPTY when no digits and no country context are available', () => {
    expect(parsePhoneNumber('').getValidationError()).toEqual({ kind: 'EMPTY' });
  });

  it('returns INVALID_COUNTRY_CODE when digits do not resolve to a country', () => {
    const controller = createInternationalInputController({});
    controller.setValue('0');

    expect(controller.getPhoneNumber().getValidationError()).toEqual({ kind: 'INVALID_COUNTRY_CODE' });
  });

  it('returns TOO_SHORT with the minimum length when the NSN is too short', () => {
    const error = parsePhoneNumber('+1 21').getValidationError();
    expect(error?.kind).toBe('TOO_SHORT');
    expect(error).toMatchObject({ kind: 'TOO_SHORT' });
    expect((error as { minLength: number }).minLength).toBeGreaterThan(0);
  });

  it('returns TOO_LONG with the maximum length when the NSN is too long', () => {
    const error = parsePhoneNumber('+1 21255512345678').getValidationError();
    expect(error?.kind).toBe('TOO_LONG');
    expect((error as { maxLength: number }).maxLength).toBeGreaterThan(0);
  });

  it('returns PATTERN_MISMATCH when length is valid but the pattern does not match', () => {
    const error = parsePhoneNumber('+1 1234567890').getValidationError();
    expect(error?.kind).toBe('PATTERN_MISMATCH');
  });

  it('returns NATIONAL_PREFIX_MISSING when a required prefix is absent', () => {
    const error = parsePhoneNumber(AE_MOBILE, { defaultCountry: 'AE' }).getValidationError();
    expect(error).toEqual({ kind: 'NATIONAL_PREFIX_MISSING', expectedPrefix: '0' });
  });

  it('does not emit NATIONAL_PREFIX_MISSING when the national prefix was typed', () => {
    expect(parsePhoneNumber(AE_MOBILE_WITH_PREFIX, { defaultCountry: 'AE' }).getValidationError()).toBeNull();
  });

  it('does not emit NATIONAL_PREFIX_MISSING when the format allows the prefix to be optional', () => {
    expect(parsePhoneNumber(US_MOBILE, { defaultCountry: 'US' }).getValidationError()).toBeNull();
  });

  it('precedence: EMPTY wins over INVALID_COUNTRY_CODE when both apply', () => {
    const controller = createInternationalInputController({});

    expect(controller.getPhoneNumber().getValidationError()).toEqual({ kind: 'EMPTY' });
  });
});
