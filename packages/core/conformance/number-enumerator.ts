import { RegionCode } from '@telixon/core';

// A distinct input for the differential fuzzer: an international '+' string, or a national string
// paired with the region it should be parsed against.
export interface EnumeratedNumber {
  readonly input: string;
  readonly region: RegionCode | undefined;
}

export interface NumberEnumeratorOptions {
  readonly callingCodes: readonly string[];
  readonly regions: readonly RegionCode[];
  readonly minLength: number;
  readonly maxLength: number;
}

export interface NumberEnumerator {
  // Number of (calling code | region) x length tracks the enumeration round-robins over.
  readonly trackCount: number;
  // Count of leading indices guaranteed distinct; at this index the shortest track's values wrap.
  readonly distinctLimit: number;
  // The number at an index. Pure: equal indices give equal numbers.
  at(index: number): EnumeratedNumber;
}

interface Track {
  readonly prefix: string;
  readonly region: RegionCode | undefined;
  readonly length: number;
}

// Spread a counter across the length-digit range by padding then reversing its digits: a bijection where
// consecutive counters differ in the leading digit, so a short run covers the whole range. % wraps the end.
function spreadOut(counter: number, length: number): string {
  const size = 10 ** length;
  const digits = (counter % size).toString().padStart(length, '0');
  let reversed = '';
  for (let position = digits.length - 1; position >= 0; position--) reversed += digits[position];
  return reversed;
}

// Distinct numbers by index, no stored set: each index round-robins to a track (calling code or region at
// a fixed length) and takes its next spreadOut value. Disjoint index ranges stay disjoint (shardable).
export function createNumberEnumerator(options: NumberEnumeratorOptions): NumberEnumerator {
  const { callingCodes, regions, minLength, maxLength } = options;
  if (!Number.isInteger(minLength) || !Number.isInteger(maxLength) || minLength < 1 || maxLength < minLength) {
    throw new RangeError(`invalid national length range: ${minLength}..${maxLength}`);
  }

  const tracks: Track[] = [];
  for (const code of callingCodes) {
    for (let length = minLength; length <= maxLength; length++) {
      tracks.push({ prefix: '+' + code, region: undefined, length });
    }
  }

  for (const region of regions) {
    for (let length = minLength; length <= maxLength; length++) {
      tracks.push({ prefix: '', region: region, length });
    }
  }
  if (tracks.length === 0) {
    throw new RangeError('number enumerator needs at least one calling code or region');
  }

  // The shortest track (10^minLength values) wraps first; every index below this is distinct.
  const distinctLimit = tracks.length * 10 ** minLength;

  return {
    trackCount: tracks.length,
    distinctLimit,
    at(index: number): EnumeratedNumber {
      const track = tracks[index % tracks.length]!;
      const counter = Math.floor(index / tracks.length);
      const national = spreadOut(counter, track.length);
      return { input: track.prefix + national, region: track.region };
    },
  };
}
