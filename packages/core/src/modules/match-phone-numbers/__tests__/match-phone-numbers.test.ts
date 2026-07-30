import { describe, expect, it } from 'vitest';
import { matchPhoneNumbers } from '..';
import { parsePhoneNumber } from '../../parse-phone-number';

describe('matchPhoneNumbers (libphonenumber isNumberMatch)', () => {
  it('grades identical numbers in different notations as an exact match', () => {
    expect(matchPhoneNumbers('+14155550132', '+1 (415) 555-0132')).toBe('EXACT_MATCH');
    expect(matchPhoneNumbers('tel:+1-415-555-0132;ext=22', '+1 415 555 0132 x22')).toBe('EXACT_MATCH');
  });

  it('caps the grade at NSN_MATCH when one side names no calling code', () => {
    expect(matchPhoneNumbers('415 555 0132', '+1 415 555 0132')).toBe('NSN_MATCH');
    expect(matchPhoneNumbers('+44 20 7183 8750', '020 7183 8750')).toBe('NSN_MATCH');
    expect(matchPhoneNumbers('415-555-0132', '415.555.0132')).toBe('NSN_MATCH');
  });

  it('grades a shorter variant of the same number as SHORT_NSN_MATCH', () => {
    expect(matchPhoneNumbers('555 0132', '+1 415 555 0132')).toBe('SHORT_NSN_MATCH');
  });

  it('grades a difference only in a leading zero or an extension presence as SHORT_NSN_MATCH', () => {
    expect(matchPhoneNumbers('+39 06 69812345', '+39 6 69812345')).toBe('SHORT_NSN_MATCH');
    expect(matchPhoneNumbers('+1 415 555 0132 ext. 22', '+1 415 555 0132')).toBe('SHORT_NSN_MATCH');
  });

  it('never matches two different explicit extensions', () => {
    expect(matchPhoneNumbers('+1 415 555 0132 ext. 22', '+1 415 555 0132 ext. 23')).toBe('NO_MATCH');
  });

  it('grades different numbers as NO_MATCH', () => {
    expect(matchPhoneNumbers('+14155550132', '+14155550133')).toBe('NO_MATCH');
  });

  it('reports NOT_A_NUMBER for input no number can be read from', () => {
    expect(matchPhoneNumbers('abc', '+14155550132')).toBe('NOT_A_NUMBER');
    expect(matchPhoneNumbers('+1', '+14155550132')).toBe('NOT_A_NUMBER');
    expect(matchPhoneNumbers('+999 123', '+14155550132')).toBe('NOT_A_NUMBER');
  });

  it('accepts parsed values on either side', () => {
    const parsed = parsePhoneNumber('+14155550132');

    expect(matchPhoneNumbers(parsed, '+1 (415) 555-0132')).toBe('EXACT_MATCH');
    expect(matchPhoneNumbers('415 555 0132', parsed)).toBe('NSN_MATCH');
    expect(matchPhoneNumbers(parsed, parsePhoneNumber('+14155550133'))).toBe('NO_MATCH');
  });
});
