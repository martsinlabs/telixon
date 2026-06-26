import { REGION_CODES } from '@telixon/core';
import { describe, expect, it } from 'vitest';
import { regionToFlagEmoji } from '../utils/region-to-flag-emoji';

describe('regionToFlagEmoji', () => {
  it('maps a region code to its two regional indicator symbols', () => {
    expect(regionToFlagEmoji('US')).toBe(String.fromCodePoint(0x1f1fa, 0x1f1f8));
    expect(regionToFlagEmoji('UA')).toBe(String.fromCodePoint(0x1f1fa, 0x1f1e6));
    expect(regionToFlagEmoji('GB')).toBe(String.fromCodePoint(0x1f1ec, 0x1f1e7));
  });

  it('returns a two-codepoint string', () => {
    expect([...regionToFlagEmoji('FR')]).toHaveLength(2);
  });

  it('produces a valid regional indicator pair for every region code', () => {
    for (const region of REGION_CODES) {
      const codePoints: number[] = [...regionToFlagEmoji(region)].map((char) => char.codePointAt(0)!);
      expect(codePoints).toHaveLength(2);
      for (const codePoint of codePoints) {
        expect(codePoint).toBeGreaterThanOrEqual(0x1f1e6);
        expect(codePoint).toBeLessThanOrEqual(0x1f1ff);
      }
    }
  });
});
