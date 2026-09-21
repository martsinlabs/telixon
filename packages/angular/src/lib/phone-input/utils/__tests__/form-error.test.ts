import { parsePhoneNumber } from '@telixon/core';
import { describe, expect, it } from 'vitest';
import { formError, toValidationErrors } from '../form-error';
import { formValue } from '../form-value';

describe('formValue and formError', () => {
  it('give a valid number its E.164 form and no error', () => {
    const phoneNumber = parsePhoneNumber('+14155550132');

    expect(formValue(phoneNumber)).toBe('+14155550132');
    expect(formError(phoneNumber)).toBe(null);
  });

  it('give an invalid number no value and its fault', () => {
    const phoneNumber = parsePhoneNumber('+1415');

    expect(formValue(phoneNumber)).toBe(null);
    expect(formError(phoneNumber)).toEqual({ kind: 'TOO_SHORT', minLength: 10 });
  });

  it('leave an empty number without a value or an error', () => {
    const phoneNumber = parsePhoneNumber('');

    expect(formValue(phoneNumber)).toBe(null);
    expect(formError(phoneNumber)).toBe(null);
  });

  it('leave a calling code without national digits without a value or an error', () => {
    const phoneNumber = parsePhoneNumber('+44');

    expect(phoneNumber.getValidationError()?.kind).toBe('TOO_SHORT');
    expect(formValue(phoneNumber)).toBe(null);
    expect(formError(phoneNumber)).toBe(null);
  });
});

describe('toValidationErrors', () => {
  it('puts an error under telixonPhone and nothing for none', () => {
    expect(toValidationErrors({ kind: 'PATTERN_MISMATCH' })).toEqual({ telixonPhone: { kind: 'PATTERN_MISMATCH' } });
    expect(toValidationErrors(null)).toBe(null);
  });
});
