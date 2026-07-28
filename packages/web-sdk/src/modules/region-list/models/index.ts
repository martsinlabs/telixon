import type { NumberType, RegionCode } from '@telixon/core';

/**
 * One entry in the rendered region list.
 *
 * - `region`: ISO region code (e.g. `'US'`).
 * - `callingCode`: numeric calling code as string (e.g. `'1'`).
 * - `displayName`: region name from `Intl.DisplayNames` for the active locale; falls back to the
 *   ISO region code when the runtime can't produce a localized name. The exact string depends on the
 *   runtime's ICU data, which leaves it byte-unstable across environments (Node/browser/ICU versions).
 * - `data`: caller-defined payload produced by {@link RegionDataFactory}; `undefined` when no factory.
 */
export type RegionOption<T = undefined> = {
  readonly region: RegionCode;
  readonly callingCode: string;
  readonly displayName: string;
  readonly data: T;
};

/**
 * Input passed to the {@link RegionDataFactory}. Carries the already-computed base fields and the
 * active locale so the factory can produce derived values without recomputing them.
 */
export type RegionDataFactoryInput = {
  readonly region: RegionCode;
  readonly callingCode: string;
  readonly displayName: string;
  readonly locale: string;
};

/**
 * Producer for the `data` slot on each {@link RegionOption}. Invoked once per region per base
 * recomputation (construction and on `localize`). Expected to be pure.
 */
export type RegionDataFactory<T = undefined> = (input: RegionDataFactoryInput) => T;

/**
 * Custom search predicate. Returns `true` to include `option` in the filtered result.
 *
 * Empty and whitespace-only queries short-circuit without calling this function. The `query` arrives
 * raw; normalize it inside the predicate when needed.
 */
export type RegionSearchFn<T = undefined> = (query: string, option: RegionOption<T>) => boolean;

/**
 * Sort selector. Built-in comparators collate `displayName` in the list's `locale` and break ties by
 * region code, which makes them total orders (stable run to run). Because `displayName` comes from
 * `Intl.DisplayNames` and collation uses the runtime's ICU, the resulting order is locale/ICU dependent
 * and not guaranteed identical across environments.
 *
 * - `'alphabetical'`: by `displayName`, then region code (default).
 * - `'callingCode'`: by numeric calling code, then `displayName`, then region code.
 * - Function: custom comparator (you own its determinism).
 */
export type RegionListSort<T = undefined> =
  | 'alphabetical'
  | 'callingCode'
  | ((a: RegionOption<T>, b: RegionOption<T>) => number);

/**
 * Construction options for {@link RegionList}.
 *
 * All fields are optional. `null` filters mean no restriction; `[]` filters mean explicitly empty
 * (kept distinct on purpose so callers can express "user-cleared filter" vs "intentionally narrowed
 * to zero results").
 */
export type RegionListOptions<T = undefined> = {
  dataFactory?: RegionDataFactory<T>;
  regionFilter?: readonly RegionCode[] | null;
  numberTypeFilter?: readonly NumberType[] | null;
  searchQuery?: string;
  searchFn?: RegionSearchFn<T>;
  locale?: string;
  sort?: RegionListSort<T>;
  prioritize?: readonly RegionCode[];
};

/**
 * Snapshot emitted on every state change.
 *
 * `options` is the post-filter, post-sort, post-prioritize list as currently rendered.
 */
export type RegionListState<T = undefined> = {
  readonly options: readonly RegionOption<T>[];
  readonly regionFilter: readonly RegionCode[] | null;
  readonly numberTypeFilter: readonly NumberType[] | null;
  readonly searchQuery: string;
  readonly locale: string;
};

/**
 * Subscriber callback. Receives the latest state on every emit.
 */
export type RegionListListener<T = undefined> = (state: RegionListState<T>) => void;

/**
 * Headless region list controller. Produces a reactive, filtered, sorted, searched, localized list
 * of region options for pickers, dropdowns, and selector UIs.
 *
 * Action verbs (`search`, `localize`) name user-driven interactions; `set*` names declarative config
 * mutations. No initial emit is fired on construction. Call `getState()` after `subscribe` to read
 * the bootstrap value.
 */
export type RegionList<T = undefined> = {
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: RegionListListener<T>): () => void;
  /** Read the current state without subscribing. */
  getState(): RegionListState<T>;

  /** Update the search query and re-run the filter pipeline. No-op when the query is unchanged. */
  search(query: string): void;
  /** Switch the locale, recompute display names and `data`, then re-run the pipeline. No-op when the locale is unchanged. */
  localize(locale: string): void;
  /** Recompute the base set (display names + `dataFactory`) and re-emit. Useful when external state read by `dataFactory` has changed. Always emits. */
  refresh(): void;
  /** Restrict the list to the given regions. `null` removes the restriction; `[]` matches nothing. No-op when the value is unchanged. */
  setRegionFilter(value: readonly RegionCode[] | null): void;
  /** Restrict the list to regions supporting at least one of the given number types. `null` removes the restriction; `[]` matches nothing. No-op when the value is unchanged. */
  setNumberTypeFilter(value: readonly NumberType[] | null): void;

  /** Clear all subscribers. Idempotent. */
  destroy(): void;
};
