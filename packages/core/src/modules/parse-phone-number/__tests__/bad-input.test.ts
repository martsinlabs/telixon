import { describe, expect, it } from 'vitest';
import { parsePhoneNumber } from '..';

describe('parsePhoneNumber bad input', () => {
  it('reports EMPTY for null and undefined instead of throwing', () => {
    for (const badInput of [null, undefined]) {
      const phoneNumber = parsePhoneNumber(badInput as unknown as string);

      expect(phoneNumber.isValid()).toBe(false);
      expect(phoneNumber.getValidationError()).toEqual({ kind: 'EMPTY' });
    }
  });

  it('reads a number input through its string form', () => {
    const phoneNumber = parsePhoneNumber(12015550123 as unknown as string, { defaultRegion: 'US' });

    expect(phoneNumber.formatE164()).toBe('+12015550123');
  });
});
