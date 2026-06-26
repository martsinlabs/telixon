import { describe, expect, it } from 'vitest';
import { decodeBase64 } from '../decode-base64';

// Node's Buffer is the reference decoder; decodeBase64 must match it exactly.
function reference(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

describe('decodeBase64', () => {
  it('decodes known vectors', () => {
    expect(decodeBase64('')).toEqual(new Uint8Array([]));
    expect(decodeBase64('TQ==')).toEqual(new Uint8Array([77])); // 2 padding chars
    expect(decodeBase64('TWE=')).toEqual(new Uint8Array([77, 97])); // 1 padding char
    expect(decodeBase64('TWFu')).toEqual(new Uint8Array([77, 97, 110])); // no padding
  });

  it('handles all byte values and the +/ alphabet', () => {
    const all = new Uint8Array(256);
    for (let i = 0; i < 256; i++) all[i] = i;
    const base64 = Buffer.from(all).toString('base64');
    expect(decodeBase64(base64)).toEqual(all);
  });

  it('matches Buffer for varied lengths (all three padding cases)', () => {
    for (let length = 0; length < 200; length++) {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) bytes[i] = (i * 31 + 7) & 0xff;
      const base64 = Buffer.from(bytes).toString('base64');
      expect(decodeBase64(base64), `length ${length}`).toEqual(reference(base64));
    }
  });

  it('throws on input whose length is not a multiple of 4 (corrupt or unpadded)', () => {
    expect(() => decodeBase64('T')).toThrow('multiple of 4');
    expect(() => decodeBase64('TWF')).toThrow('multiple of 4');
  });
});
