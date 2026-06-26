// @vitest-environment happy-dom

import { REGION_CODES } from '@telixon/core';
import { describe, expect, it, vi } from 'vitest';
import type { RegionOption } from '../models';
import { createRegionList } from '../region-list';

describe('createRegionList: defaults', () => {
  it('emits options for every region with locale=en when no options are provided', () => {
    const list = createRegionList();
    const state = list.getState();

    expect(state.options.length).toBe(REGION_CODES.length);
    expect(state.locale).toBe('en');
    expect(state.regionFilter).toBe(null);
    expect(state.numberTypeFilter).toBe(null);
    expect(state.searchQuery).toBe('');

    list.destroy();
  });

  it('sets data to undefined on every option when no dataFactory is provided', () => {
    const list = createRegionList();
    for (const option of list.getState().options) {
      expect(option.data).toBe(undefined);
    }
    list.destroy();
  });

  it('calls dataFactory with region, callingCode, displayName, and locale for each region', () => {
    const factory = vi.fn((input) => ({ tag: `${input.region}-${input.locale}` }));
    const list = createRegionList({ dataFactory: factory, locale: 'en' });

    expect(factory).toHaveBeenCalledTimes(REGION_CODES.length);

    const firstCall = factory.mock.calls[0]![0];
    expect(firstCall).toHaveProperty('region');
    expect(firstCall).toHaveProperty('callingCode');
    expect(firstCall).toHaveProperty('displayName');
    expect(firstCall.locale).toBe('en');

    list.destroy();
  });

  it('stores the dataFactory return value on each option', () => {
    const list = createRegionList({
      dataFactory: (input) => ({ tag: `${input.region}-${input.locale}` }),
      locale: 'en',
    });
    const usOption = list.getState().options.find((option) => option.region === 'US');
    expect(usOption?.data).toEqual({ tag: 'US-en' });
    list.destroy();
  });
});

describe('createRegionList: filters', () => {
  it('restricts options to those in regionFilter', () => {
    const list = createRegionList({ regionFilter: ['US', 'UA'] });
    const regions = list.getState().options.map((o) => o.region);
    expect(regions.sort()).toEqual(['UA', 'US']);
    list.destroy();
  });

  it('restricts options to regions supporting the given numberTypeFilter', () => {
    const list = createRegionList({ regionFilter: ['US', 'UA', 'GB'], numberTypeFilter: ['MOBILE'] });
    const regions = list.getState().options.map((o) => o.region);
    expect(regions.length).toBeGreaterThan(0);
    for (const c of regions) expect(['US', 'UA', 'GB']).toContain(c);
    list.destroy();
  });

  it('combines regionFilter and numberTypeFilter with AND semantics', () => {
    const list = createRegionList({ regionFilter: ['US'], numberTypeFilter: ['TOLL_FREE'] });
    const state = list.getState();
    expect(state.options.length).toBe(1);
    expect(state.options[0]!.region).toBe('US');
    list.destroy();
  });

  it('treats null regionFilter as no restriction and [] as matches nothing', () => {
    const allList = createRegionList({ regionFilter: null });
    expect(allList.getState().options.length).toBe(REGION_CODES.length);

    const noneList = createRegionList({ regionFilter: [] });
    expect(noneList.getState().options.length).toBe(0);

    allList.destroy();
    noneList.destroy();
  });
});

describe('createRegionList: default search', () => {
  it('matches displayName case-insensitively', () => {
    const list = createRegionList({ searchQuery: 'united states' });
    const regions = list.getState().options.map((o) => o.region);
    expect(regions).toContain('US');
    list.destroy();
  });

  it('strips accents in displayName matching', () => {
    const list = createRegionList({ searchQuery: 'cote' });
    const regions = list.getState().options.map((o) => o.region);
    expect(regions).toContain('CI');
    list.destroy();
  });

  it('matches the region (ISO region) code', () => {
    const list = createRegionList({ searchQuery: 'us' });
    const regions = list.getState().options.map((o) => o.region);
    expect(regions).toContain('US');
    list.destroy();
  });

  it('matches the callingCode without a leading +', () => {
    const list = createRegionList({ searchQuery: '380' });
    const regions = list.getState().options.map((o) => o.region);
    expect(regions).toContain('UA');
    list.destroy();
  });

  it('matches the callingCode with a leading +', () => {
    const list = createRegionList({ searchQuery: '+380' });
    const regions = list.getState().options.map((o) => o.region);
    expect(regions).toContain('UA');
    list.destroy();
  });
});

describe('createRegionList: custom searchFn', () => {
  it('invokes the custom searchFn with the raw query and option', () => {
    const searchFn = vi.fn((query: string, option: RegionOption) => option.region === 'US' && query === 'foo');
    const list = createRegionList({ searchFn, searchQuery: 'foo' });

    const result = list.getState().options.map((o) => o.region);

    expect(searchFn).toHaveBeenCalled();
    const firstArgs = searchFn.mock.calls[0]!;
    expect(typeof firstArgs[0]).toBe('string');
    expect(firstArgs[1]).toHaveProperty('region');
    expect(result).toEqual(['US']);

    list.destroy();
  });

  it('does not invoke the custom searchFn when the query is empty', () => {
    const searchFn = vi.fn(() => true);
    const list = createRegionList({ searchFn, searchQuery: '' });

    expect(searchFn).not.toHaveBeenCalled();

    list.destroy();
  });

  it('does not invoke the custom searchFn when the query is whitespace-only', () => {
    const searchFn = vi.fn(() => true);
    const list = createRegionList({ searchFn, searchQuery: '   \t  ' });

    expect(searchFn).not.toHaveBeenCalled();

    list.destroy();
  });
});

describe('createRegionList: sort', () => {
  it('sorts alphabetically by displayName by default', () => {
    const list = createRegionList({ regionFilter: ['US', 'UA', 'GB'] });
    const names = list.getState().options.map((o) => o.displayName);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
    list.destroy();
  });

  it('sorts numerically by callingCode when sort=callingCode', () => {
    const list = createRegionList({ regionFilter: ['US', 'UA', 'GB'], sort: 'callingCode' });
    const regions = list.getState().options.map((o) => o.region);
    expect(regions).toEqual(['US', 'GB', 'UA']);
    list.destroy();
  });

  it('uses a custom comparator function when provided', () => {
    const list = createRegionList({
      regionFilter: ['US', 'UA', 'GB'],
      sort: (a, b) => b.region.localeCompare(a.region),
    });
    const regions = list.getState().options.map((o) => o.region);
    expect(regions).toEqual(['US', 'UA', 'GB']);
    list.destroy();
  });
});

describe('createRegionList: prioritize', () => {
  it('places prioritized regions at the top in the given order', () => {
    const list = createRegionList({
      regionFilter: ['US', 'UA', 'GB', 'DE', 'FR'],
      prioritize: ['UA', 'US'],
    });
    const regions = list.getState().options.map((o) => o.region);
    expect(regions.slice(0, 2)).toEqual(['UA', 'US']);
    list.destroy();
  });

  it('leaves the remaining options in sort order after prioritized ones', () => {
    const list = createRegionList({
      regionFilter: ['US', 'UA', 'GB', 'DE', 'FR'],
      prioritize: ['UA'],
    });
    const restDisplayNames = list
      .getState()
      .options.slice(1)
      .map((o) => o.displayName);
    const restSorted = [...restDisplayNames].sort((a, b) => a.localeCompare(b));
    expect(restDisplayNames).toEqual(restSorted);
    list.destroy();
  });

  it('deduplicates repeated prioritized regions', () => {
    const list = createRegionList({
      regionFilter: ['US', 'UA', 'GB'],
      prioritize: ['UA', 'UA', 'US'],
    });
    const regions = list.getState().options.map((o) => o.region);
    expect(regions.filter((region) => region === 'UA')).toEqual(['UA']);
    expect(regions.slice(0, 2)).toEqual(['UA', 'US']);
    list.destroy();
  });
});

describe('createRegionList: localize', () => {
  it('recomputes displayName when locale changes', () => {
    const list = createRegionList({ regionFilter: ['US'] });
    const nameEn = list.getState().options[0]!.displayName;

    list.localize('fr');
    const nameFr = list.getState().options[0]!.displayName;

    expect(nameEn).not.toBe(nameFr);
    expect(list.getState().locale).toBe('fr');

    list.destroy();
  });

  it('re-invokes dataFactory with the new locale', () => {
    const factory = vi.fn((input) => ({ tag: input.locale }));
    const list = createRegionList({ dataFactory: factory, regionFilter: ['US'] });

    factory.mockClear();
    list.localize('fr');

    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ locale: 'fr' }));

    list.destroy();
  });
});

describe('createRegionList: refresh', () => {
  it('recomputes the base set, re-invoking dataFactory for every region', () => {
    const factory = vi.fn((input) => ({ tag: input.region }));
    const list = createRegionList({ dataFactory: factory });

    factory.mockClear();
    list.refresh();

    expect(factory).toHaveBeenCalledTimes(REGION_CODES.length);

    list.destroy();
  });

  it('emits to subscribers even when no state value has changed', () => {
    const list = createRegionList();
    const listener = vi.fn();
    list.subscribe(listener);

    list.refresh();

    expect(listener).toHaveBeenCalledTimes(1);

    list.destroy();
  });
});

describe('createRegionList: no-op detection', () => {
  it('does not emit when setRegionFilter is called with an equal array', () => {
    const list = createRegionList({ regionFilter: ['US', 'UA'] });
    const listener = vi.fn();
    list.subscribe(listener);

    list.setRegionFilter(['US', 'UA']);

    expect(listener).not.toHaveBeenCalled();
    list.destroy();
  });

  it('does not emit when search is called with the same query', () => {
    const list = createRegionList({ searchQuery: 'us' });
    const listener = vi.fn();
    list.subscribe(listener);

    list.search('us');

    expect(listener).not.toHaveBeenCalled();
    list.destroy();
  });

  it('does not emit when localize is called with the same locale', () => {
    const list = createRegionList({ locale: 'en' });
    const listener = vi.fn();
    list.subscribe(listener);

    list.localize('en');

    expect(listener).not.toHaveBeenCalled();
    list.destroy();
  });
});

describe('createRegionList: subscribe and destroy', () => {
  it('emits synchronously to subscribers after a mutator', () => {
    const list = createRegionList();
    const listener = vi.fn();
    list.subscribe(listener);

    list.search('united');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].searchQuery).toBe('united');

    list.destroy();
  });

  it('returns an unsubscribe function that stops further notifications', () => {
    const list = createRegionList();
    const listener = vi.fn();
    const unsubscribe = list.subscribe(listener);

    list.search('one');
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    list.search('two');

    expect(listener).toHaveBeenCalledTimes(1);

    list.destroy();
  });

  it('clears all listeners on destroy', () => {
    const list = createRegionList();
    const listener = vi.fn();
    list.subscribe(listener);

    list.destroy();
    list.search('any');

    expect(listener).not.toHaveBeenCalled();
  });
});
