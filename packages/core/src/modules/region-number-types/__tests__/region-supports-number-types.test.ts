import { describe, expect, it } from 'vitest';
import { regionSupportsNumberTypes } from '../region-supports-number-types';

describe('regionSupportsNumberTypes', () => {
  it('is true when the region supports the requested type', () => {
    expect(regionSupportsNumberTypes('US', ['MOBILE'])).toBe(true);
    expect(regionSupportsNumberTypes('UA', ['FIXED_LINE'])).toBe(true);
  });

  it('expands a FIXED_LINE_OR_MOBILE query to FIXED_LINE or MOBILE', () => {
    expect(regionSupportsNumberTypes('US', ['FIXED_LINE_OR_MOBILE'])).toBe(true);
  });

  it('is true when any of the requested types is supported', () => {
    expect(regionSupportsNumberTypes('US', ['UNKNOWN', 'MOBILE'])).toBe(true);
  });

  it('is false for an empty type list', () => {
    expect(regionSupportsNumberTypes('US', [])).toBe(false);
  });

  it('is false for UNKNOWN, which matches nothing', () => {
    expect(regionSupportsNumberTypes('US', ['UNKNOWN'])).toBe(false);
  });
});
