// @vitest-environment happy-dom

import { REGION_IDS } from '@telixon/core';
import { describe, expect, it, vi } from 'vitest';
import { createCountryList } from '../country-list';
import type { CountryOption } from '../models';

describe('createCountryList: defaults', () => {
  it('emits options for every region with locale=en when no options are provided', () => {
    const list = createCountryList();
    const state = list.getState();

    expect(state.options.length).toBe(REGION_IDS.length);
    expect(state.locale).toBe('en');
    expect(state.countryFilter).toBe(null);
    expect(state.numberTypeFilter).toBe(null);
    expect(state.searchQuery).toBe('');

    list.destroy();
  });

  it('sets data to undefined on every option when no dataFactory is provided', () => {
    const list = createCountryList();
    for (const option of list.getState().options) {
      expect(option.data).toBe(undefined);
    }
    list.destroy();
  });

  it('calls dataFactory with country, callingCode, displayName, and locale for each region', () => {
    const factory = vi.fn((input) => ({ tag: `${input.country}-${input.locale}` }));
    const list = createCountryList({ dataFactory: factory, locale: 'en' });

    expect(factory).toHaveBeenCalledTimes(REGION_IDS.length);

    const firstCall = factory.mock.calls[0]![0];
    expect(firstCall).toHaveProperty('country');
    expect(firstCall).toHaveProperty('callingCode');
    expect(firstCall).toHaveProperty('displayName');
    expect(firstCall.locale).toBe('en');

    list.destroy();
  });
});

describe('createCountryList: filters', () => {
  it('restricts options to those in countryFilter', () => {
    const list = createCountryList({ countryFilter: ['US', 'UA'] });
    const countries = list.getState().options.map((o) => o.country);
    expect(countries.sort()).toEqual(['UA', 'US']);
    list.destroy();
  });

  it('restricts options to regions supporting the given numberTypeFilter', () => {
    const list = createCountryList({ countryFilter: ['US', 'UA', 'GB'], numberTypeFilter: ['MOBILE'] });
    const countries = list.getState().options.map((o) => o.country);
    expect(countries.length).toBeGreaterThan(0);
    for (const c of countries) expect(['US', 'UA', 'GB']).toContain(c);
    list.destroy();
  });

  it('combines countryFilter and numberTypeFilter with AND semantics', () => {
    const list = createCountryList({ countryFilter: ['US'], numberTypeFilter: ['TOLL_FREE'] });
    const state = list.getState();
    expect(state.options.length).toBe(1);
    expect(state.options[0]!.country).toBe('US');
    list.destroy();
  });

  it('treats null countryFilter as no restriction and [] as matches nothing', () => {
    const allList = createCountryList({ countryFilter: null });
    expect(allList.getState().options.length).toBe(REGION_IDS.length);

    const noneList = createCountryList({ countryFilter: [] });
    expect(noneList.getState().options.length).toBe(0);

    allList.destroy();
    noneList.destroy();
  });
});

describe('createCountryList: default search', () => {
  it('matches displayName case-insensitively', () => {
    const list = createCountryList({ searchQuery: 'united states' });
    const countries = list.getState().options.map((o) => o.country);
    expect(countries).toContain('US');
    list.destroy();
  });

  it('strips accents in displayName matching', () => {
    const list = createCountryList({ searchQuery: 'cote' });
    const countries = list.getState().options.map((o) => o.country);
    expect(countries).toContain('CI');
    list.destroy();
  });

  it('matches the country (ISO region) code', () => {
    const list = createCountryList({ searchQuery: 'us' });
    const countries = list.getState().options.map((o) => o.country);
    expect(countries).toContain('US');
    list.destroy();
  });

  it('matches the callingCode without a leading +', () => {
    const list = createCountryList({ searchQuery: '380' });
    const countries = list.getState().options.map((o) => o.country);
    expect(countries).toContain('UA');
    list.destroy();
  });

  it('matches the callingCode with a leading +', () => {
    const list = createCountryList({ searchQuery: '+380' });
    const countries = list.getState().options.map((o) => o.country);
    expect(countries).toContain('UA');
    list.destroy();
  });
});

describe('createCountryList: custom searchFn', () => {
  it('invokes the custom searchFn with the raw query and option', () => {
    const searchFn = vi.fn((query: string, option: CountryOption) => option.country === 'US' && query === 'foo');
    const list = createCountryList({ searchFn, searchQuery: 'foo' });

    const result = list.getState().options.map((o) => o.country);

    expect(searchFn).toHaveBeenCalled();
    const firstArgs = searchFn.mock.calls[0]!;
    expect(typeof firstArgs[0]).toBe('string');
    expect(firstArgs[1]).toHaveProperty('country');
    expect(result).toEqual(['US']);

    list.destroy();
  });

  it('does not invoke the custom searchFn when the query is empty', () => {
    const searchFn = vi.fn(() => true);
    const list = createCountryList({ searchFn, searchQuery: '' });

    expect(searchFn).not.toHaveBeenCalled();

    list.destroy();
  });

  it('does not invoke the custom searchFn when the query is whitespace-only', () => {
    const searchFn = vi.fn(() => true);
    const list = createCountryList({ searchFn, searchQuery: '   \t  ' });

    expect(searchFn).not.toHaveBeenCalled();

    list.destroy();
  });
});

describe('createCountryList: sort', () => {
  it('sorts alphabetically by displayName by default', () => {
    const list = createCountryList({ countryFilter: ['US', 'UA', 'GB'] });
    const names = list.getState().options.map((o) => o.displayName);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
    list.destroy();
  });

  it('sorts numerically by callingCode when sort=callingCode', () => {
    const list = createCountryList({ countryFilter: ['US', 'UA', 'GB'], sort: 'callingCode' });
    const countries = list.getState().options.map((o) => o.country);
    expect(countries).toEqual(['US', 'GB', 'UA']);
    list.destroy();
  });

  it('uses a custom comparator function when provided', () => {
    const list = createCountryList({
      countryFilter: ['US', 'UA', 'GB'],
      sort: (a, b) => b.country.localeCompare(a.country),
    });
    const countries = list.getState().options.map((o) => o.country);
    expect(countries).toEqual(['US', 'UA', 'GB']);
    list.destroy();
  });
});

describe('createCountryList: prioritize', () => {
  it('places prioritized regions at the top in the given order', () => {
    const list = createCountryList({
      countryFilter: ['US', 'UA', 'GB', 'DE', 'FR'],
      prioritize: ['UA', 'US'],
    });
    const countries = list.getState().options.map((o) => o.country);
    expect(countries.slice(0, 2)).toEqual(['UA', 'US']);
    list.destroy();
  });

  it('leaves the remaining options in sort order after prioritized ones', () => {
    const list = createCountryList({
      countryFilter: ['US', 'UA', 'GB', 'DE', 'FR'],
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
});

describe('createCountryList: localize', () => {
  it('recomputes displayName when locale changes', () => {
    const list = createCountryList({ countryFilter: ['US'] });
    const nameEn = list.getState().options[0]!.displayName;

    list.localize('fr');
    const nameFr = list.getState().options[0]!.displayName;

    expect(nameEn).not.toBe(nameFr);
    expect(list.getState().locale).toBe('fr');

    list.destroy();
  });

  it('re-invokes dataFactory with the new locale', () => {
    const factory = vi.fn((input) => ({ tag: input.locale }));
    const list = createCountryList({ dataFactory: factory, countryFilter: ['US'] });

    factory.mockClear();
    list.localize('fr');

    expect(factory).toHaveBeenCalledWith(expect.objectContaining({ locale: 'fr' }));

    list.destroy();
  });
});

describe('createCountryList: refresh', () => {
  it('recomputes the base set, re-invoking dataFactory for every region', () => {
    const factory = vi.fn((input) => ({ tag: input.country }));
    const list = createCountryList({ dataFactory: factory });

    factory.mockClear();
    list.refresh();

    expect(factory).toHaveBeenCalledTimes(REGION_IDS.length);

    list.destroy();
  });

  it('emits to subscribers even when no state value has changed', () => {
    const list = createCountryList();
    const listener = vi.fn();
    list.subscribe(listener);

    list.refresh();

    expect(listener).toHaveBeenCalledTimes(1);

    list.destroy();
  });
});

describe('createCountryList: no-op detection', () => {
  it('does not emit when setCountryFilter is called with an equal array', () => {
    const list = createCountryList({ countryFilter: ['US', 'UA'] });
    const listener = vi.fn();
    list.subscribe(listener);

    list.setCountryFilter(['US', 'UA']);

    expect(listener).not.toHaveBeenCalled();
    list.destroy();
  });

  it('does not emit when search is called with the same query', () => {
    const list = createCountryList({ searchQuery: 'us' });
    const listener = vi.fn();
    list.subscribe(listener);

    list.search('us');

    expect(listener).not.toHaveBeenCalled();
    list.destroy();
  });

  it('does not emit when localize is called with the same locale', () => {
    const list = createCountryList({ locale: 'en' });
    const listener = vi.fn();
    list.subscribe(listener);

    list.localize('en');

    expect(listener).not.toHaveBeenCalled();
    list.destroy();
  });
});

describe('createCountryList: subscribe and destroy', () => {
  it('emits synchronously to subscribers after a mutator', () => {
    const list = createCountryList();
    const listener = vi.fn();
    list.subscribe(listener);

    list.search('united');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].searchQuery).toBe('united');

    list.destroy();
  });

  it('returns an unsubscribe function that stops further notifications', () => {
    const list = createCountryList();
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
    const list = createCountryList();
    const listener = vi.fn();
    list.subscribe(listener);

    list.destroy();
    list.search('any');

    expect(listener).not.toHaveBeenCalled();
  });
});
