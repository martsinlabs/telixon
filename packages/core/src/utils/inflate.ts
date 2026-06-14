// RFC 1951 DEFLATE decoder (stored, fixed- and dynamic-Huffman blocks): pure JS, runs identically on any runtime.

// Decode table for one canonical Huffman tree: `entries` indexed by the next LSB-first bits masked by `indexMask`; each packs `symbol << 4 | codeLength`, 0 = invalid.
interface HuffmanTable {
  readonly entries: Uint16Array;
  readonly indexMask: number;
}

// Match-length codes 257..285 (RFC 1951 section 3.2.5).
const LENGTH_BASE: Uint16Array = new Uint16Array([
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258,
]);
const LENGTH_EXTRA_BITS: Uint8Array = new Uint8Array([
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0,
]);

// Match-distance codes 0..29 (RFC 1951 section 3.2.5).
const DISTANCE_BASE: Uint16Array = new Uint16Array([
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577,
]);
const DISTANCE_EXTRA_BITS: Uint8Array = new Uint8Array([
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13,
]);

// Transmission order of the code-length alphabet lengths (RFC 1951 section 3.2.7).
const CODE_LENGTH_SYMBOL_ORDER: Uint8Array = new Uint8Array([
  16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15,
]);

const END_OF_BLOCK_SYMBOL = 256;
const FIRST_LENGTH_SYMBOL = 257;

// Builds the LSB-first lookup table for one canonical Huffman tree from per-symbol code lengths (all-zero lengths yield an all-invalid table).
function buildHuffmanTable(codeLengths: Uint8Array): HuffmanTable {
  let maxLength = 0;
  for (let symbol = 0; symbol < codeLengths.length; symbol++) {
    if (codeLengths[symbol]! > maxLength) maxLength = codeLengths[symbol]!;
  }
  if (maxLength === 0) return { entries: new Uint16Array(1), indexMask: 0 };

  const lengthCounts = new Uint16Array(maxLength + 1);
  for (let symbol = 0; symbol < codeLengths.length; symbol++) {
    lengthCounts[codeLengths[symbol]!] = lengthCounts[codeLengths[symbol]!]! + 1;
  }
  lengthCounts[0] = 0;

  // Canonical coding: the first code of each length follows from the counts of shorter lengths.
  const nextCode = new Uint16Array(maxLength + 1);
  let code = 0;
  for (let length = 1; length <= maxLength; length++) {
    code = (code + lengthCounts[length - 1]!) << 1;
    nextCode[length] = code;
  }

  const entries = new Uint16Array(1 << maxLength);
  for (let symbol = 0; symbol < codeLengths.length; symbol++) {
    const length: number = codeLengths[symbol]!;
    if (length === 0) continue;

    const canonical: number = nextCode[length]!;
    nextCode[length] = canonical + 1;
    if (canonical >= 1 << length) throw new Error('inflate: over-subscribed Huffman code lengths');

    // Codes arrive LSB-first, so the canonical (MSB-first) code indexes the table bit-reversed.
    let reversed = 0;
    for (let bit = 0; bit < length; bit++) reversed |= ((canonical >> bit) & 1) << (length - 1 - bit);

    const entry: number = (symbol << 4) | length;
    for (let index = reversed; index < entries.length; index += 1 << length) entries[index] = entry;
  }
  return { entries, indexMask: entries.length - 1 };
}

// Fixed-Huffman trees (RFC 1951 section 3.2.6), built once on first use.
let fixedTables: { literal: HuffmanTable; distance: HuffmanTable } | undefined;

function getFixedTables(): { literal: HuffmanTable; distance: HuffmanTable } {
  if (fixedTables) return fixedTables;

  const literalLengths = new Uint8Array(288);
  literalLengths.fill(8, 0, 144);
  literalLengths.fill(9, 144, 256);
  literalLengths.fill(7, 256, 280);
  literalLengths.fill(8, 280, 288);

  fixedTables = {
    literal: buildHuffmanTable(literalLengths),
    distance: buildHuffmanTable(new Uint8Array(30).fill(5)),
  };
  return fixedTables;
}

// Inflates a raw DEFLATE stream into the caller-allocated `output`, which must be the exact decompressed length (gzip ISIZE); throws on malformed input.
export function inflateInto(input: Uint8Array, output: Uint8Array): void {
  // Padding lets the bit reader fetch a full 3-byte window near the end without bounds checks; an over-read past `totalBits` is rejected after each block.
  const data = new Uint8Array(input.length + 4);
  data.set(input);
  const totalBits: number = input.length * 8;

  let bitPosition = 0;
  let outputPosition = 0;

  function readBits(count: number): number {
    const byteIndex: number = bitPosition >> 3;
    const window: number = data[byteIndex]! | (data[byteIndex + 1]! << 8) | (data[byteIndex + 2]! << 16);
    const value: number = (window >> (bitPosition & 7)) & ((1 << count) - 1);
    bitPosition += count;
    return value;
  }

  function decodeSymbol(table: HuffmanTable): number {
    const byteIndex: number = bitPosition >> 3;
    const window: number = data[byteIndex]! | (data[byteIndex + 1]! << 8) | (data[byteIndex + 2]! << 16);
    const entry: number = table.entries[(window >> (bitPosition & 7)) & table.indexMask]!;
    const length: number = entry & 15;
    if (length === 0) throw new Error('inflate: invalid Huffman code');
    bitPosition += length;
    return entry >> 4;
  }

  // Reads the dynamic-block tree definitions (RFC 1951 section 3.2.7).
  function readDynamicTables(): { literal: HuffmanTable; distance: HuffmanTable } {
    const literalCount: number = readBits(5) + 257;
    const distanceCount: number = readBits(5) + 1;
    const codeLengthCount: number = readBits(4) + 4;

    const codeLengthLengths = new Uint8Array(19);
    for (let index = 0; index < codeLengthCount; index++) {
      codeLengthLengths[CODE_LENGTH_SYMBOL_ORDER[index]!] = readBits(3);
    }
    const codeLengthTable: HuffmanTable = buildHuffmanTable(codeLengthLengths);

    const lengths = new Uint8Array(literalCount + distanceCount);
    let position = 0;
    while (position < lengths.length) {
      const symbol: number = decodeSymbol(codeLengthTable);
      if (symbol < 16) {
        lengths[position++] = symbol;
        continue;
      }

      let repeatValue = 0;
      let repeatCount: number;
      if (symbol === 16) {
        if (position === 0) throw new Error('inflate: repeat code with no previous length');
        repeatValue = lengths[position - 1]!;
        repeatCount = 3 + readBits(2);
      } else if (symbol === 17) {
        repeatCount = 3 + readBits(3);
      } else {
        repeatCount = 11 + readBits(7);
      }
      if (position + repeatCount > lengths.length) throw new Error('inflate: length repeat overruns the alphabet');
      while (repeatCount-- > 0) lengths[position++] = repeatValue;
    }

    if (lengths[END_OF_BLOCK_SYMBOL] === 0) throw new Error('inflate: missing end-of-block code');
    return {
      literal: buildHuffmanTable(lengths.subarray(0, literalCount)),
      distance: buildHuffmanTable(lengths.subarray(literalCount)),
    };
  }

  function copyStoredBlock(): void {
    bitPosition = (bitPosition + 7) & ~7;
    const byteIndex: number = bitPosition >> 3;
    const storedLength: number = data[byteIndex]! | (data[byteIndex + 1]! << 8);
    const storedComplement: number = data[byteIndex + 2]! | (data[byteIndex + 3]! << 8);
    if ((storedLength ^ storedComplement) !== 0xffff) throw new Error('inflate: stored block length mismatch');
    bitPosition += 32;

    const start: number = bitPosition >> 3;
    if (start + storedLength > input.length) throw new Error('inflate: truncated stored block');
    if (outputPosition + storedLength > output.length) throw new Error('inflate: output overflow');
    output.set(data.subarray(start, start + storedLength), outputPosition);
    outputPosition += storedLength;
    bitPosition += storedLength * 8;
  }

  function decodeCompressedBlock(literal: HuffmanTable, distance: HuffmanTable): void {
    for (;;) {
      const symbol: number = decodeSymbol(literal);
      if (symbol < END_OF_BLOCK_SYMBOL) {
        if (outputPosition >= output.length) throw new Error('inflate: output overflow');
        output[outputPosition++] = symbol;
        continue;
      }
      if (symbol === END_OF_BLOCK_SYMBOL) return;

      const lengthIndex: number = symbol - FIRST_LENGTH_SYMBOL;
      if (lengthIndex >= LENGTH_BASE.length) throw new Error('inflate: invalid length symbol');
      const matchLength: number = LENGTH_BASE[lengthIndex]! + readBits(LENGTH_EXTRA_BITS[lengthIndex]!);

      const distanceSymbol: number = decodeSymbol(distance);
      if (distanceSymbol >= DISTANCE_BASE.length) throw new Error('inflate: invalid distance symbol');
      const matchDistance: number = DISTANCE_BASE[distanceSymbol]! + readBits(DISTANCE_EXTRA_BITS[distanceSymbol]!);

      if (matchDistance > outputPosition) throw new Error('inflate: match distance before output start');
      if (outputPosition + matchLength > output.length) throw new Error('inflate: output overflow');

      // Byte-by-byte copy is required: a match may overlap its own output (distance < length).
      let copyFrom: number = outputPosition - matchDistance;
      for (let count = 0; count < matchLength; count++) output[outputPosition++] = output[copyFrom++]!;
    }
  }

  let isFinalBlock = false;
  while (!isFinalBlock) {
    isFinalBlock = readBits(1) === 1;
    const blockType: number = readBits(2);

    if (blockType === 0) {
      copyStoredBlock();
    } else if (blockType === 1) {
      const tables = getFixedTables();
      decodeCompressedBlock(tables.literal, tables.distance);
    } else if (blockType === 2) {
      const tables = readDynamicTables();
      decodeCompressedBlock(tables.literal, tables.distance);
    } else {
      throw new Error('inflate: reserved block type');
    }

    if (bitPosition > totalBits) throw new Error('inflate: truncated input');
  }

  if (outputPosition !== output.length) throw new Error('inflate: decompressed length mismatch');
}
