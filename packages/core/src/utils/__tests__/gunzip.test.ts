import { constants, gzipSync, gunzipSync as zlibGunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { gunzipSync } from '../gunzip';

// Deterministic pseudo-random bytes (incompressible: exercises stored blocks at every level).
function randomBytes(length: number, seed: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let state: number = seed;
  for (let index = 0; index < length; index++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    bytes[index] = state & 0xff;
  }
  return bytes;
}

// Repetitive bytes (highly compressible: exercises long matches and dynamic Huffman trees).
function repetitiveBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let index = 0; index < length; index++) bytes[index] = (index % 64 < 48 ? index % 7 : index % 251) & 0xff;
  return bytes;
}

describe('gunzipSync', () => {
  // The 30s budget covers zlib compressing 1 MB of incompressible data at level 9.
  it('is byte-identical to zlib across sizes, levels, and block strategies', { timeout: 30_000 }, () => {
    const sizes: number[] = [0, 1, 3, 100, 65535, 1 << 20];
    const levels: number[] = [0, 1, 6, 9];
    for (const size of sizes) {
      for (const payload of [randomBytes(size, size + 1), repetitiveBytes(size)]) {
        for (const level of levels) {
          expect(gunzipSync(new Uint8Array(gzipSync(payload, { level })))).toEqual(payload);
        }
        // Z_FIXED forces fixed-Huffman blocks, which no default-strategy input guarantees.
        expect(gunzipSync(new Uint8Array(gzipSync(payload, { strategy: constants.Z_FIXED })))).toEqual(payload);
      }
    }
  });

  it('round-trips through zlib for a representative payload', () => {
    const payload = repetitiveBytes(4096);
    const compressed = new Uint8Array(gzipSync(payload));
    expect(gunzipSync(compressed)).toEqual(new Uint8Array(zlibGunzipSync(compressed)));
  });

  it('rejects non-gzip input', () => {
    expect(() => gunzipSync(randomBytes(64, 7))).toThrow('not gzip data');
  });

  it('rejects truncated input', () => {
    const compressed = new Uint8Array(gzipSync(repetitiveBytes(4096)));
    expect(() => gunzipSync(compressed.subarray(0, 12))).toThrow();
    expect(() => gunzipSync(compressed.subarray(0, compressed.length >> 1))).toThrow();
  });

  it('rejects corrupted payload bytes', () => {
    const compressed = new Uint8Array(gzipSync(repetitiveBytes(4096)));
    for (const flipOffset of [12, compressed.length >> 1, compressed.length - 10]) {
      const corrupted = new Uint8Array(compressed);
      corrupted[flipOffset] = corrupted[flipOffset]! ^ 0xff;
      expect(() => gunzipSync(corrupted)).toThrow();
    }
  });
});
