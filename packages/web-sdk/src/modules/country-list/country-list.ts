import type { NumberType, RegionId } from '@telixon/core';
import { countrySupportsNumberTypes } from '@telixon/core';
import { readonlyArraysEqual } from '../../utils/readonly-arrays-equal';
import type {
  CountryDataFactory,
  CountryList,
  CountryListListener,
  CountryListOptions,
  CountryListSort,
  CountryListState,
  CountryOption,
  CountrySearchFn,
} from './models';
import { computeBaseOptions } from './utils/base';
import { defaultSearch } from './utils/search';
import { resolveCountryListComparator } from './utils/sort';

const DEFAULT_LOCALE: string = 'en';

/**
 * Create a headless country list controller.
 *
 * Pipeline on every state change: base set (cached per locale) -> countryFilter -> numberTypeFilter
 * -> searchFn -> sort -> prioritize -> emit. Mutators that don't change the underlying value skip
 * emission (no-op detection via shallow array equality and string equality).
 *
 * Generic `T` flows from the optional `dataFactory` return type; when omitted, `T` defaults to
 * `undefined` and the `data` slot is present but unused.
 */
export function createCountryList<T = undefined>(options: CountryListOptions<T> = {}): CountryList<T> {
  const dataFactory: CountryDataFactory<T> | undefined = options.dataFactory;
  const searchFn: CountrySearchFn<T> = options.searchFn ?? defaultSearch;
  const sortConfig: CountryListSort<T> | undefined = options.sort;
  const prioritize: readonly RegionId[] = options.prioritize ?? [];

  let locale: string = options.locale ?? DEFAULT_LOCALE;
  let countryFilter: readonly RegionId[] | null = options.countryFilter ?? null;
  let numberTypeFilter: readonly NumberType[] | null = options.numberTypeFilter ?? null;
  let searchQuery: string = options.searchQuery ?? '';

  let baseSet: CountryOption<T>[] = computeBaseOptions(locale, dataFactory);

  const listeners: Set<CountryListListener<T>> = new Set();
  let isDestroyed: boolean = false;
  let cachedState: CountryListState<T> | null = null;

  function runPipeline(): CountryOption<T>[] {
    const hasQuery: boolean = searchQuery.trim() !== '';
    const hasCountryFilter: boolean = countryFilter !== null;
    const hasNumberTypeFilter: boolean = numberTypeFilter !== null;

    let filtered: CountryOption<T>[];
    if (!hasCountryFilter && !hasNumberTypeFilter && !hasQuery) {
      filtered = baseSet.slice();
    } else {
      filtered = [];
      for (const option of baseSet) {
        if (hasCountryFilter && !countryFilter!.includes(option.country)) continue;
        if (hasNumberTypeFilter && !countrySupportsNumberTypes(option.country, numberTypeFilter!)) continue;
        if (hasQuery && !searchFn(searchQuery, option)) continue;
        filtered.push(option);
      }
    }

    filtered.sort(resolveCountryListComparator(sortConfig));

    if (prioritize.length > 0) {
      const prioritizeSet: Set<RegionId> = new Set(prioritize);
      const byCountry: Map<RegionId, CountryOption<T>> = new Map();
      for (const option of filtered) byCountry.set(option.country, option);

      const prioritized: CountryOption<T>[] = [];
      for (const region of prioritize) {
        const option = byCountry.get(region);
        if (option) prioritized.push(option);
      }

      const rest: CountryOption<T>[] = [];
      for (const option of filtered) {
        if (!prioritizeSet.has(option.country)) rest.push(option);
      }

      filtered = prioritized.concat(rest);
    }

    return filtered;
  }

  function buildState(): CountryListState<T> {
    if (cachedState !== null) return cachedState;

    cachedState = {
      options: runPipeline(),
      countryFilter,
      numberTypeFilter,
      searchQuery,
      locale,
    };

    return cachedState;
  }

  function emit(): void {
    cachedState = null;
    if (isDestroyed) return;

    const state: CountryListState<T> = buildState();
    for (const listener of listeners) listener(state);
  }

  return {
    getState(): CountryListState<T> {
      return buildState();
    },

    subscribe(listener: CountryListListener<T>): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    search(query: string): void {
      if (query === searchQuery) return;
      searchQuery = query;
      emit();
    },

    localize(nextLocale: string): void {
      if (nextLocale === locale) return;
      locale = nextLocale;
      baseSet = computeBaseOptions(locale, dataFactory);
      emit();
    },

    refresh(): void {
      baseSet = computeBaseOptions(locale, dataFactory);
      emit();
    },

    setCountryFilter(value: readonly RegionId[] | null): void {
      if (readonlyArraysEqual(value, countryFilter)) return;
      countryFilter = value;
      emit();
    },

    setNumberTypeFilter(value: readonly NumberType[] | null): void {
      if (readonlyArraysEqual(value, numberTypeFilter)) return;
      numberTypeFilter = value;
      emit();
    },

    destroy(): void {
      isDestroyed = true;
      listeners.clear();
    },
  };
}
