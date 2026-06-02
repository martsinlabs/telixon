import { describe, expect, it } from 'vitest';
import { getPlaceholders } from '../get-placeholders';

describe('getPlaceholders', () => {
  it('returns all three variants for a region with a national prefix', () => {
    const result = getPlaceholders('US', 'MOBILE');

    expect(result).not.toBeNull();
    expect(result!.national).toBe('(201) 555-0123');
    expect(result!.nationalWithPrefix).toBe('1 (201) 555-0123');
    expect(result!.international).toBe('201-555-0123');
  });

  it('omits nationalWithPrefix for a region without a national prefix', () => {
    const result = getPlaceholders('AD', 'MOBILE');

    expect(result).not.toBeNull();
    expect(result!.national).toBeDefined();
    expect(result!.international).toBeDefined();
    expect(result!.nationalWithPrefix).toBeUndefined();
  });

  it('returns null when the requested type has no recorded example for the region', () => {
    expect(getPlaceholders('US', 'VOICEMAIL')).toBeNull();
  });

  it('FIXED_LINE_OR_MOBILE aliasing resolves to FIXED_LINE first, then MOBILE', () => {
    const fixedLine = getPlaceholders('US', 'FIXED_LINE');
    const alias = getPlaceholders('US', 'FIXED_LINE_OR_MOBILE');

    expect(alias).not.toBeNull();
    expect(alias).toEqual(fixedLine);
  });

  it('UNKNOWN returns null', () => {
    expect(getPlaceholders('US', 'UNKNOWN')).toBeNull();
  });
});
