import { RegionId } from '@telixon/core';
import { describe, expect, it } from 'vitest';
import { createNumberEnumerator, NumberEnumerator } from './number-enumerator';

const CALLING_CODES = ['1', '44', '380'];
const REGIONS = ['US', 'GB', 'UA'] as RegionId[];
const key = (enumerator: NumberEnumerator, index: number): string => {
  const number = enumerator.at(index);
  return `${number.input} ${number.country ?? ''}`;
};

describe('createNumberEnumerator', () => {
  it('rejects an invalid length range', () => {
    expect(() => createNumberEnumerator({ callingCodes: ['1'], regions: [], minLength: 0, maxLength: 4 })).toThrow();
    expect(() => createNumberEnumerator({ callingCodes: ['1'], regions: [], minLength: 5, maxLength: 4 })).toThrow();
  });

  it('requires at least one track', () => {
    expect(() => createNumberEnumerator({ callingCodes: [], regions: [], minLength: 2, maxLength: 3 })).toThrow();
  });

  it('emits well-formed international and national inputs', () => {
    const enumerator = createNumberEnumerator({
      callingCodes: CALLING_CODES,
      regions: REGIONS,
      minLength: 5,
      maxLength: 7,
    });
    for (let index = 0; index < 2000; index++) {
      const number = enumerator.at(index);
      if (number.country === undefined) {
        expect(number.input).toMatch(/^\+\d+$/);
      } else {
        expect(number.input).toMatch(/^\d+$/);
        expect(REGIONS).toContain(number.country);
      }
    }
  });

  it('is pure: equal indices give equal numbers', () => {
    const enumerator = createNumberEnumerator({
      callingCodes: CALLING_CODES,
      regions: REGIONS,
      minLength: 4,
      maxLength: 8,
    });
    for (const index of [0, 1, 42, 1000, 999_999]) {
      expect(enumerator.at(index)).toEqual(enumerator.at(index));
    }
  });

  it('yields distinct numbers across the entire guaranteed range', () => {
    const enumerator = createNumberEnumerator({
      callingCodes: ['1', '44'],
      regions: ['US'] as RegionId[],
      minLength: 2,
      maxLength: 2,
    });
    const seen = new Set<string>();
    for (let index = 0; index < enumerator.distinctLimit; index++) seen.add(key(enumerator, index));
    expect(seen.size).toBe(enumerator.distinctLimit);
  });

  it('wraps exactly at the distinct limit (the bound is tight)', () => {
    const enumerator = createNumberEnumerator({
      callingCodes: ['1', '44'],
      regions: ['US'] as RegionId[],
      minLength: 2,
      maxLength: 2,
    });
    expect(key(enumerator, enumerator.distinctLimit)).toBe(key(enumerator, 0));
  });

  it('produces disjoint numbers for disjoint index ranges (shardable)', () => {
    const enumerator = createNumberEnumerator({
      callingCodes: CALLING_CODES,
      regions: REGIONS,
      minLength: 5,
      maxLength: 9,
    });
    const low = new Set<string>();
    for (let index = 0; index < 50_000; index++) low.add(key(enumerator, index));
    let overlap = 0;
    for (let index = 5_000_000; index < 5_050_000; index++) if (low.has(key(enumerator, index))) overlap++;
    expect(overlap).toBe(0);
  });
});
