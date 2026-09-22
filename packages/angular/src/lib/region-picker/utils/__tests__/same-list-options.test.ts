import { describe, expect, it } from 'vitest';
import { sameListOptions } from '../same-list-options';

describe('sameListOptions', () => {
  it('treats equal priority regions in a new array as the same list', () => {
    expect(
      sameListOptions(
        { sort: 'alphabetical', prioritize: ['US', 'CA'] },
        { sort: 'alphabetical', prioritize: ['US', 'CA'] },
      ),
    ).toBe(true);
  });

  it('tells a new sort or priority order apart', () => {
    const base = { sort: 'alphabetical', prioritize: ['US', 'CA'] } as const;

    expect(sameListOptions(base, { ...base, sort: 'callingCode' })).toBe(false);
    expect(sameListOptions(base, { ...base, prioritize: ['CA', 'US'] })).toBe(false);
    expect(sameListOptions(base, { ...base, prioritize: ['US'] })).toBe(false);
  });
});
