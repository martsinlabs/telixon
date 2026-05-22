import { REGION_IDS } from '@telixon/core/engine';
import { describe, expect, it } from 'vitest';
import { getCountryCallingCode } from '../get-country-calling-code';

describe('getCountryCallingCode', () => {
  it('returns the calling code for a region', () => {
    expect(getCountryCallingCode('US')).toBe('1');
    expect(getCountryCallingCode('GB')).toBe('44');
    expect(getCountryCallingCode('AR')).toBe('54');
    expect(getCountryCallingCode('UA')).toBe('380');
  });

  it('maps every region of a shared calling code to that code', () => {
    expect(getCountryCallingCode('CA')).toBe('1');
    expect(getCountryCallingCode('AG')).toBe('1');
    expect(getCountryCallingCode('KZ')).toBe('7');
    expect(getCountryCallingCode('RU')).toBe('7');
  });

  it('returns a non-empty numeric code for every supported region', () => {
    for (const region of REGION_IDS) {
      expect(getCountryCallingCode(region), region).toMatch(/^\d+$/);
    }
  });
});
