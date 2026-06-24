import { MetadataNumberType, RegionCode } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { describe, expect, it } from 'vitest';
import { createNumberTypeFilter, createRegionFilter } from '../filter-factory';

function metadataTypeIndex(type: MetadataNumberType): number {
  return getResourceProvider().numberTypeNames.indexOf(type);
}

function regionIndex(id: RegionCode): number {
  return getResourceProvider().regionKeyToIndex[id] ?? -1;
}

function bitsSetAt(filter: Uint8Array, indices: readonly number[]): boolean {
  return indices.every((i) => filter[i] === 1);
}

function countBits(filter: Uint8Array): number {
  let count = 0;
  for (const bit of filter) if (bit === 1) count++;
  return count;
}

describe('createRegionFilter', () => {
  it('sets bits for each valid region id', () => {
    const filter = createRegionFilter(['US', 'CA']);

    expect(filter[regionIndex('US')]).toBe(1);
    expect(filter[regionIndex('CA')]).toBe(1);
    expect(countBits(filter)).toBe(2);
  });

  it('returns an all-zero filter for an empty list', () => {
    const filter = createRegionFilter([]);

    expect(countBits(filter)).toBe(0);
  });

  it('does not set a bit for an unknown region id', () => {
    const filter = createRegionFilter(['US']);
    const beforeCount = countBits(filter);

    // @ts-expect-error 'ZZ' is not a CLDR region: runtime safeguard test
    const filterWithUnknown = createRegionFilter(['US', 'ZZ']);

    expect(countBits(filterWithUnknown)).toBe(beforeCount);
  });

  it('handles duplicate ids idempotently', () => {
    const filter = createRegionFilter(['US', 'US', 'US']);

    expect(filter[regionIndex('US')]).toBe(1);
    expect(countBits(filter)).toBe(1);
  });
});

describe('createNumberTypeFilter', () => {
  it('always sets the GENERAL_DESC bit, even for an empty input', () => {
    const filter = createNumberTypeFilter([]);

    expect(filter[metadataTypeIndex('GENERAL_DESC')]).toBe(1);
    expect(countBits(filter)).toBe(1);
  });

  it('sets the concrete type bit plus GENERAL_DESC', () => {
    const filter = createNumberTypeFilter(['MOBILE']);

    expect(bitsSetAt(filter, [metadataTypeIndex('MOBILE'), metadataTypeIndex('GENERAL_DESC')])).toBe(true);
    expect(countBits(filter)).toBe(2);
  });

  it('expands FIXED_LINE_OR_MOBILE to both FIXED_LINE and MOBILE bits', () => {
    const filter = createNumberTypeFilter(['FIXED_LINE_OR_MOBILE']);

    expect(
      bitsSetAt(filter, [
        metadataTypeIndex('FIXED_LINE'),
        metadataTypeIndex('MOBILE'),
        metadataTypeIndex('GENERAL_DESC'),
      ]),
    ).toBe(true);
    expect(countBits(filter)).toBe(3);
  });

  it('treats UNKNOWN as a no-op (only GENERAL_DESC is set)', () => {
    const filter = createNumberTypeFilter(['UNKNOWN']);

    expect(filter[metadataTypeIndex('GENERAL_DESC')]).toBe(1);
    expect(countBits(filter)).toBe(1);
  });

  it('accumulates bits across multiple types', () => {
    const filter = createNumberTypeFilter(['MOBILE', 'TOLL_FREE', 'VOIP']);

    expect(
      bitsSetAt(filter, [
        metadataTypeIndex('MOBILE'),
        metadataTypeIndex('TOLL_FREE'),
        metadataTypeIndex('VOIP'),
        metadataTypeIndex('GENERAL_DESC'),
      ]),
    ).toBe(true);
    expect(countBits(filter)).toBe(4);
  });

  it('FIXED_LINE_OR_MOBILE combined with MOBILE does not double-count the MOBILE bit', () => {
    const filter = createNumberTypeFilter(['FIXED_LINE_OR_MOBILE', 'MOBILE']);

    expect(countBits(filter)).toBe(3);
  });

  it('silently skips a type that is not in the metadata vocabulary', () => {
    // @ts-expect-error 'GIBBERISH' is not a NumberType: runtime safeguard test
    const filter = createNumberTypeFilter(['MOBILE', 'GIBBERISH']);

    expect(filter[metadataTypeIndex('MOBILE')]).toBe(1);
    expect(countBits(filter)).toBe(2);
  });
});
