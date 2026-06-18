import { describe, expect, it } from 'vitest';
import { countrySupportsNumberTypes } from '../country-supports-number-types';

describe('countrySupportsNumberTypes', () => {
  it('is true when the country supports the requested type', () => {
    expect(countrySupportsNumberTypes('US', ['MOBILE'])).toBe(true);
    expect(countrySupportsNumberTypes('UA', ['FIXED_LINE'])).toBe(true);
  });

  it('expands a FIXED_LINE_OR_MOBILE query to FIXED_LINE or MOBILE', () => {
    expect(countrySupportsNumberTypes('US', ['FIXED_LINE_OR_MOBILE'])).toBe(true);
  });

  it('is true when any of the requested types is supported', () => {
    expect(countrySupportsNumberTypes('US', ['UNKNOWN', 'MOBILE'])).toBe(true);
  });

  it('is false for an empty type list', () => {
    expect(countrySupportsNumberTypes('US', [])).toBe(false);
  });

  it('is false for UNKNOWN, which matches nothing', () => {
    expect(countrySupportsNumberTypes('US', ['UNKNOWN'])).toBe(false);
  });
});
