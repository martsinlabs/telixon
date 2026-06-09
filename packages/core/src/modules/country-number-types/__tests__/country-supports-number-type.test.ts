import { describe, expect, it } from 'vitest';
import { countrySupportsNumberType } from '../country-supports-number-type';

describe('countrySupportsNumberType', () => {
  it('is true when the country supports the requested type', () => {
    expect(countrySupportsNumberType('US', ['MOBILE'])).toBe(true);
    expect(countrySupportsNumberType('UA', ['FIXED_LINE'])).toBe(true);
  });

  it('expands a FIXED_LINE_OR_MOBILE query to FIXED_LINE or MOBILE', () => {
    expect(countrySupportsNumberType('US', ['FIXED_LINE_OR_MOBILE'])).toBe(true);
  });

  it('is true when any of the requested types is supported', () => {
    expect(countrySupportsNumberType('US', ['UNKNOWN', 'MOBILE'])).toBe(true);
  });

  it('is false for an empty type list', () => {
    expect(countrySupportsNumberType('US', [])).toBe(false);
  });

  it('is false for UNKNOWN, which matches nothing', () => {
    expect(countrySupportsNumberType('US', ['UNKNOWN'])).toBe(false);
  });
});
