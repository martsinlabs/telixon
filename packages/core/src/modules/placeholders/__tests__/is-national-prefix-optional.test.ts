import { describe, expect, it } from 'vitest';
import { parsePhoneNumber } from '../../parse-phone-number';
import { getPlaceholders } from '../get-placeholders';
import { isNationalPrefixOptional } from '../is-national-prefix-optional';

describe('isNationalPrefixOptional', () => {
  it('answers true where a number is written without its trunk prefix', () => {
    // A United States number is dialed as (201) 555-0123, with the trunk 1 only for long distance.
    expect(isNationalPrefixOptional('US', 'FIXED_LINE')).toBe(true);
  });

  it('answers false where the national format carries the prefix', () => {
    // A United Kingdom number is written 020 7183 8750, trunk zero and all.
    expect(isNationalPrefixOptional('GB', 'FIXED_LINE')).toBe(false);
  });

  it('answers false for a region the engine does not know', () => {
    expect(isNationalPrefixOptional('ZZ' as never, 'MOBILE')).toBe(false);
  });

  // A region whose prefix is not optional reports the missing trunk on a prefix-free number.
  it('agrees with the fault the parser reports for a prefix-free number', () => {
    for (const region of ['US', 'GB', 'DE', 'FR', 'BR', 'SE'] as const) {
      const national: string | undefined = getPlaceholders(region, 'FIXED_LINE')?.national;
      if (national === undefined) continue;
      const parsed = parsePhoneNumber(national, { defaultRegion: region });
      const missingPrefix: boolean = parsed.getValidationError()?.kind === 'NATIONAL_PREFIX_MISSING';

      expect(isNationalPrefixOptional(region, 'FIXED_LINE'), region).toBe(!missingPrefix);
    }
  });
});
