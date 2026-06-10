import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { gunzip } from '../gunzip';

describe('gunzip', () => {
  it('decompresses gzip bytes back to the original', async () => {
    const raw = new Uint8Array(4096);
    for (let i = 0; i < raw.length; i++) raw[i] = (i * 37 + 11) & 0xff;
    const compressed = new Uint8Array(gzipSync(Buffer.from(raw)));

    expect(await gunzip(compressed)).toEqual(raw);
  });
});
