import { REGION_IDS } from '@telixon/core/engine';
import { describe, expect, it } from 'vitest';
import { getCallingCodeForCountry } from '../get-calling-code-for-country';

describe('getCallingCodeForCountry', () => {
  it('returns the calling code for a region', () => {
    expect(getCallingCodeForCountry('US')).toBe('1');
    expect(getCallingCodeForCountry('GB')).toBe('44');
    expect(getCallingCodeForCountry('AR')).toBe('54');
    expect(getCallingCodeForCountry('UA')).toBe('380');
  });

  it('maps every region of a shared calling code to that code', () => {
    expect(getCallingCodeForCountry('CA')).toBe('1');
    expect(getCallingCodeForCountry('AG')).toBe('1');
    expect(getCallingCodeForCountry('KZ')).toBe('7');
    expect(getCallingCodeForCountry('RU')).toBe('7');
  });

  it('returns a non-empty numeric code for every supported region', () => {
    for (const region of REGION_IDS) {
      expect(getCallingCodeForCountry(region), region).toMatch(/^\d+$/);
    }
  });
});
