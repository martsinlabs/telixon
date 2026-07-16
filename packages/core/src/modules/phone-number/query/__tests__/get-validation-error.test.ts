import { getExampleNumber } from '@telixon/core/testing';
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

  it('returns EMPTY when no digits and no region context are available', () => {
    expect(parsePhoneNumber('').getValidationError()).toEqual({ kind: 'EMPTY' });
  });

  it('returns INVALID_CALLING_CODE when digits do not resolve to a region', () => {
    const controller = createInternationalInputController({});
    controller.setValue('0');

    expect(controller.getPhoneNumber().getValidationError()).toEqual({ kind: 'INVALID_CALLING_CODE' });
  });

  it('returns TOO_SHORT with the minimum length when the NSN is too short', () => {
    const error = parsePhoneNumber('+1 21').getValidationError();
    expect(error).toEqual({ kind: 'TOO_SHORT', minLength: 10 });
  });

  it('returns TOO_LONG with the maximum length when the NSN is too long', () => {
    const error = parsePhoneNumber('+1 21255512345678').getValidationError();
    expect(error).toEqual({ kind: 'TOO_LONG', maxLength: 10 });
  });

  it('returns INVALID_LENGTH when the length falls in a gap between valid lengths', () => {
    // Colombia has national numbers of 8, 10, and 11 digits; 9 digits is a gap.
    const error = parsePhoneNumber('321123456', { defaultRegion: 'CO' }).getValidationError();
    expect(error).toEqual({ kind: 'INVALID_LENGTH', possibleLengths: [8, 10, 11] });
  });

  it('treats a number past the 32-digit shift boundary as TOO_LONG, not a false possible', () => {
    // 42 national digits hits bit 10 (42 mod 32) of the length mask without a guard; must stay TOO_LONG.
    const number = parsePhoneNumber('+1' + '2'.repeat(42));
    expect(number.isPossibleWithReason()).toBe('TOO_LONG');
    expect(number.getValidationError()).toEqual({ kind: 'TOO_LONG', maxLength: 10 });
    expect(number.formatE164()).toBeNull();
  });

  it('returns PATTERN_MISMATCH when length is valid but the pattern does not match', () => {
    const error = parsePhoneNumber('+1 1234567890').getValidationError();
    expect(error?.kind).toBe('PATTERN_MISMATCH');
  });

  it('returns POSSIBLE_LOCAL_ONLY for a number possible only for local dialing', () => {
    const error = parsePhoneNumber('+11234567').getValidationError();
    expect(error).toEqual({ kind: 'POSSIBLE_LOCAL_ONLY' });
  });

  it('returns NATIONAL_PREFIX_MISSING when a required prefix is absent', () => {
    const error = parsePhoneNumber(AE_MOBILE, { defaultRegion: 'AE' }).getValidationError();
    expect(error).toEqual({ kind: 'NATIONAL_PREFIX_MISSING', expectedPrefix: '0' });
  });

  it('does not emit NATIONAL_PREFIX_MISSING when the national prefix was typed', () => {
    expect(parsePhoneNumber(AE_MOBILE_WITH_PREFIX, { defaultRegion: 'AE' }).getValidationError()).toBeNull();
  });

  it('does not emit NATIONAL_PREFIX_MISSING when the format allows the prefix to be optional', () => {
    expect(parsePhoneNumber(US_MOBILE, { defaultRegion: 'US' }).getValidationError()).toBeNull();
  });

  it('does not emit NATIONAL_PREFIX_MISSING for a valid international number', () => {
    expect(parsePhoneNumber('+442079460000').getValidationError()).toBeNull();
  });

  it('precedence: EMPTY wins over INVALID_CALLING_CODE when both apply', () => {
    const controller = createInternationalInputController({});

    expect(controller.getPhoneNumber().getValidationError()).toEqual({ kind: 'EMPTY' });
  });
});
