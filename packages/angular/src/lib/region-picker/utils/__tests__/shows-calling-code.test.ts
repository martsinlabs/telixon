import { describe, expect, it } from 'vitest';
import { showsCallingCode } from '../shows-calling-code';

describe('showsCallingCode', () => {
  it('shows the calling code once the field keeps it out of its text', () => {
    expect(
      showsCallingCode({ mode: 'international', defaultRegion: 'US', display: { callingCodeInInput: false } }),
    ).toBe(true);
  });

  it('leaves the calling code to a field that shows it, and to a national field', () => {
    expect(showsCallingCode({ mode: 'international' })).toBe(false);
    expect(
      showsCallingCode({ mode: 'international', display: { callingCodeInInput: true, plusPrefix: 'fixed' } }),
    ).toBe(false);
    expect(showsCallingCode({ mode: 'national', defaultRegion: 'US' })).toBe(false);
  });
});
