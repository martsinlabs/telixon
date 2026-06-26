import type { NumberType, RegionCode } from '@telixon/core';
import { EngineNotReadyError, isEngineReady, regionSupportsNumberTypes } from '@telixon/core';
import { readonlyArraysEqual } from '../../utils/readonly-arrays-equal';
import type {
  RegionDataFactory,
  RegionList,
  RegionListListener,
  RegionListOptions,
  RegionListSort,
  RegionListState,
  RegionOption,
  RegionSearchFn,
} from './models';
import { computeBaseOptions } from './utils/base';
import { defaultSearch } from './utils/search';
import { resolveRegionListComparator } from './utils/sort';

const DEFAULT_LOCALE: string = 'en';

/**
 * Create a headless region list controller.
 *
 * Pipeline on every state change: base set (cached per locale) -> regionFilter -> numberTypeFilter
 * -> searchFn -> sort -> prioritize -> emit. Mutators that don't change the underlying value skip
 * emission (no-op detection via shallow array equality and string equality).
 *
 * Generic `T` flows from the optional `dataFactory` return type; when omitted, `T` defaults to
 * `undefined` and the `data` slot is present but unused.
 *
 * Requires the engine to be ready (see `ensureEngineReady`); throws `EngineNotReadyError` otherwise.
 */
export function createRegionList<T = undefined>(options: RegionListOptions<T> = {}): RegionList<T> {
  if (!isEngineReady()) throw new EngineNotReadyError();

  const dataFactory: RegionDataFactory<T> | undefined = options.dataFactory;
  const searchFn: RegionSearchFn<T> = options.searchFn ?? defaultSearch;
  const sortConfig: RegionListSort<T> | undefined = options.sort;
  const prioritize: readonly RegionCode[] = options.prioritize ?? [];

  let locale: string = options.locale ?? DEFAULT_LOCALE;
  let regionFilter: readonly RegionCode[] | null = options.regionFilter ?? null;
  let numberTypeFilter: readonly NumberType[] | null = options.numberTypeFilter ?? null;
  let searchQuery: string = options.searchQuery ?? '';

  let baseSet: RegionOption<T>[] = computeBaseOptions(locale, dataFactory);

  const listeners: Set<RegionListListener<T>> = new Set();
  let isDestroyed: boolean = false;
  let cachedState: RegionListState<T> | null = null;

  function runPipeline(): RegionOption<T>[] {
    const hasQuery: boolean = searchQuery.trim() !== '';
    const hasRegionFilter: boolean = regionFilter !== null;
    const hasNumberTypeFilter: boolean = numberTypeFilter !== null;

    let filtered: RegionOption<T>[];
    if (!hasRegionFilter && !hasNumberTypeFilter && !hasQuery) {
      filtered = baseSet.slice();
    } else {
      filtered = [];
      for (const option of baseSet) {
        if (hasRegionFilter && !regionFilter!.includes(option.region)) continue;
        if (hasNumberTypeFilter && !regionSupportsNumberTypes(option.region, numberTypeFilter!)) continue;
        if (hasQuery && !searchFn(searchQuery, option)) continue;
        filtered.push(option);
      }
    }

    filtered.sort(resolveRegionListComparator(sortConfig, locale));

    if (prioritize.length > 0) {
      const prioritizeSet: Set<RegionCode> = new Set(prioritize);
      const byRegion: Map<RegionCode, RegionOption<T>> = new Map();
      for (const option of filtered) byRegion.set(option.region, option);

      const prioritized: RegionOption<T>[] = [];
      for (const region of prioritizeSet) {
        const option = byRegion.get(region);
        if (option) prioritized.push(option);
      }

      const rest: RegionOption<T>[] = [];
      for (const option of filtered) {
        if (!prioritizeSet.has(option.region)) rest.push(option);
      }

      filtered = prioritized.concat(rest);
    }

    return filtered;
  }

  function buildState(): RegionListState<T> {
    if (cachedState !== null) return cachedState;

    cachedState = {
      options: runPipeline(),
      regionFilter,
      numberTypeFilter,
      searchQuery,
      locale,
    };

    return cachedState;
  }

  function emit(): void {
    cachedState = null;
    if (isDestroyed) return;

    const state: RegionListState<T> = buildState();
    for (const listener of listeners) listener(state);
  }

  return {
    getState(): RegionListState<T> {
      return buildState();
    },

    subscribe(listener: RegionListListener<T>): () => void {
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

    setRegionFilter(value: readonly RegionCode[] | null): void {
      if (readonlyArraysEqual(value, regionFilter)) return;
      regionFilter = value;
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
