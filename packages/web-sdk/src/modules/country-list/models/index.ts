import type { NumberType, RegionId } from '@telixon/core';

/**
 * One entry in the rendered country list.
 *
 * - `country`: ISO region code (e.g. `'US'`).
 * - `callingCode`: numeric country calling code as string (e.g. `'1'`).
 * - `displayName`: country name from `Intl.DisplayNames` for the active locale; falls back to the
 *   ISO region code when the runtime can't produce a localized name.
 * - `data`: caller-defined payload produced by {@link CountryDataFactory}; `undefined` when no factory.
 */
export type CountryOption<T = undefined> = {
  country: RegionId;
  callingCode: string;
  displayName: string;
  data: T;
};

/**
 * Input passed to the {@link CountryDataFactory}. Carries the already-computed base fields and the
 * active locale so the factory can produce derived values without recomputing them.
 */
export type CountryDataFactoryInput = {
  country: RegionId;
  callingCode: string;
  displayName: string;
  locale: string;
};

/**
 * Producer for the `data` slot on each {@link CountryOption}. Invoked once per region per base
 * recomputation (construction and on `localize`). Expected to be pure.
 */
export type CountryDataFactory<T> = (input: CountryDataFactoryInput) => T;

/**
 * Custom search predicate. Returns `true` to include `option` in the filtered result.
 *
 * The library short-circuits empty and whitespace-only queries and does not invoke this function.
 * The function receives the raw `query`; perform any normalization needed internally.
 */
export type CountrySearchFn<T> = (query: string, option: CountryOption<T>) => boolean;

/**
 * Sort selector.
 *
 * - `'alphabetical'`: by `displayName.localeCompare`.
 * - `'callingCode'`: by numeric calling code, with `displayName` as tiebreaker.
 * - Function: custom comparator.
 */
export type CountryListSort<T> =
  | 'alphabetical'
  | 'callingCode'
  | ((a: CountryOption<T>, b: CountryOption<T>) => number);

/**
 * Construction options for {@link CountryList}.
 *
 * All fields are optional. `null` filters mean no restriction; `[]` filters mean explicitly empty
 * (kept distinct on purpose so callers can express "user-cleared filter" vs "intentionally narrowed
 * to zero results").
 */
export type CountryListOptions<T = undefined> = {
  dataFactory?: CountryDataFactory<T>;
  countryFilter?: readonly RegionId[] | null;
  numberTypeFilter?: readonly NumberType[] | null;
  searchQuery?: string;
  searchFn?: CountrySearchFn<T>;
  locale?: string;
  sort?: CountryListSort<T>;
  prioritize?: readonly RegionId[];
};

/**
 * Snapshot emitted on every state change.
 *
 * `options` is the post-filter, post-sort, post-prioritize list as currently rendered.
 */
export type CountryListState<T = undefined> = {
  options: readonly CountryOption<T>[];
  countryFilter: readonly RegionId[] | null;
  numberTypeFilter: readonly NumberType[] | null;
  searchQuery: string;
  locale: string;
};

/**
 * Subscriber callback. Receives the latest state on every emit.
 */
export type CountryListListener<T> = (state: CountryListState<T>) => void;

/**
 * Headless country list controller. Produces a reactive, filtered, sorted, searched, localized list
 * of country options for pickers, dropdowns, and selector UIs.
 *
 * The naming distinction is intentional: action verbs (`search`, `localize`) name user-driven
 * interactions; `set*` names declarative config mutations. No initial emit is fired on
 * construction. Call `getState()` after `subscribe` to read the bootstrap value.
 */
export type CountryList<T = undefined> = {
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: CountryListListener<T>): () => void;
  /** Read the current state without subscribing. */
  getState(): CountryListState<T>;

  /** Update the search query and re-run the filter pipeline. No-op when the query is unchanged. */
  search(query: string): void;
  /** Switch the locale, recompute display names and `data`, then re-run the pipeline. No-op when the locale is unchanged. */
  localize(locale: string): void;
  /** Recompute the base set (display names + `dataFactory`) and re-emit. Useful when external state read by `dataFactory` has changed. Always emits. */
  refresh(): void;
  /** Restrict the list to the given regions. `null` removes the restriction; `[]` matches nothing. No-op when the value is unchanged. */
  setCountryFilter(value: readonly RegionId[] | null): void;
  /** Restrict the list to regions supporting at least one of the given number types. `null` removes the restriction; `[]` matches nothing. No-op when the value is unchanged. */
  setNumberTypeFilter(value: readonly NumberType[] | null): void;

  /** Clear all subscribers. Idempotent. */
  destroy(): void;
};
