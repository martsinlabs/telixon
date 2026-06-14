// RFC 1952 gzip decoder over the pure-JS DEFLATE decoder: synchronous, dependency-free, verifies the CRC32 and length trailer.
import { inflateInto } from './inflate';

const GZIP_HEADER_LENGTH = 10;
const GZIP_TRAILER_LENGTH = 8;

// DEFLATE cannot expand beyond 1032:1, so a larger ISIZE is a corrupted trailer; rejecting it avoids a multi-gigabyte output allocation.
const MAX_DEFLATE_EXPANSION_RATIO = 1032;

const FLAG_HEADER_CRC = 0x02;
const FLAG_EXTRA = 0x04;
const FLAG_NAME = 0x08;
const FLAG_COMMENT = 0x10;

const CRC32_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let byteValue = 0; byteValue < 256; byteValue++) {
    let value: number = byteValue;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    table[byteValue] = value >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = -1;
  for (let index = 0; index < bytes.length; index++) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ bytes[index]!) & 0xff]!;
  }
  return (crc ^ -1) >>> 0;
}

function readUint32LittleEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16) | (bytes[offset + 3]! << 24)) >>> 0;
}

// Returns the offset of the DEFLATE body, past the fixed header and any optional fields.
function readHeaderEnd(compressed: Uint8Array): number {
  if (compressed[0] !== 0x1f || compressed[1] !== 0x8b) throw new Error('gunzip: not gzip data');
  if (compressed[2] !== 8) throw new Error('gunzip: unsupported compression method');

  const flags: number = compressed[3]!;
  const bodyLimit: number = compressed.length - GZIP_TRAILER_LENGTH;
  let offset: number = GZIP_HEADER_LENGTH;

  if (flags & FLAG_EXTRA) {
    offset += 2 + (compressed[offset]! | (compressed[offset + 1]! << 8));
  }
  if (flags & FLAG_NAME) {
    while (offset < bodyLimit && compressed[offset] !== 0) offset++;
    offset++;
  }
  if (flags & FLAG_COMMENT) {
    while (offset < bodyLimit && compressed[offset] !== 0) offset++;
    offset++;
  }
  if (flags & FLAG_HEADER_CRC) offset += 2;

  if (offset >= bodyLimit) throw new Error('gunzip: truncated input');
  return offset;
}

// Decompresses a single-member gzip stream into an exact-size buffer (from the ISIZE trailer), so `.buffer` is the data with no copy.
export function gunzipSync(compressed: Uint8Array): Uint8Array<ArrayBuffer> {
  if (compressed.length < GZIP_HEADER_LENGTH + GZIP_TRAILER_LENGTH) throw new Error('gunzip: truncated input');

  const bodyOffset: number = readHeaderEnd(compressed);
  const trailerOffset: number = compressed.length - GZIP_TRAILER_LENGTH;
  const expectedCrc: number = readUint32LittleEndian(compressed, trailerOffset);
  const decompressedLength: number = readUint32LittleEndian(compressed, trailerOffset + 4);
  if (decompressedLength > (trailerOffset - bodyOffset) * MAX_DEFLATE_EXPANSION_RATIO + 64) {
    throw new Error('gunzip: implausible decompressed length');
  }

  const output = new Uint8Array(decompressedLength);
  inflateInto(compressed.subarray(bodyOffset, trailerOffset), output);

  if (crc32(output) !== expectedCrc) throw new Error('gunzip: CRC32 mismatch');
  return output;
}
