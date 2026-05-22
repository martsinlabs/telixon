import { REGION_IDS } from '@telixon/core/engine';
import { describe, expect, it } from 'vitest';
import { getCallingCodeForRegion } from '../get-calling-code-for-region';

describe('getCallingCodeForRegion', () => {
  it('returns the calling code for a region', () => {
    expect(getCallingCodeForRegion('US')).toBe('1');
    expect(getCallingCodeForRegion('GB')).toBe('44');
    expect(getCallingCodeForRegion('AR')).toBe('54');
    expect(getCallingCodeForRegion('UA')).toBe('380');
  });

  it('maps every region of a shared calling code to that code', () => {
    expect(getCallingCodeForRegion('CA')).toBe('1');
    expect(getCallingCodeForRegion('AG')).toBe('1');
    expect(getCallingCodeForRegion('KZ')).toBe('7');
    expect(getCallingCodeForRegion('RU')).toBe('7');
  });

  it('returns a non-empty numeric code for every supported region', () => {
    for (const region of REGION_IDS) {
      expect(getCallingCodeForRegion(region), region).toMatch(/^\d+$/);
    }
  });
});
