import type { RegionCode } from '@telixon/core';
import type { PhoneInput } from '../../phone-input/models';
import type { RegionList, RegionOption } from '../../region-list/models';

/**
 * Construction options for {@link RegionPicker}.
 *
 * - `regions`: the list the picker reads its rows from. The picker never destroys it.
 * - `phone`: when given, the phone input owns the selected region. The picker follows the phone's
 *   resolved region. `select` hands the region to the phone.
 */
export type RegionPickerOptions<T = undefined> = {
  regions: RegionList<T>;
  phone?: PhoneInput;
};

/**
 * Snapshot emitted on every state change.
 *
 * - `open`: whether the list is shown.
 * - `selected`: the option for the selected region, or `null` until one is selected.
 * - `active`: the region under the keyboard cursor, or `null`. Only set while open.
 * - `options`: the rows as `regions` currently renders them.
 * - `searchQuery`: the query applied to `options`.
 */
export type RegionPickerState<T = undefined> = {
  readonly open: boolean;
  readonly selected: RegionOption<T> | null;
  readonly active: RegionCode | null;
  readonly options: readonly RegionOption<T>[];
  readonly searchQuery: string;
};

/**
 * Subscriber callback. Receives the latest state on every emit.
 */
export type RegionPickerListener<T = undefined> = (state: RegionPickerState<T>) => void;

/**
 * The headless widget behind a region picker's trigger and list.
 *
 * Bound to a phone input, the phone is the single source of the selected region. `select` hands the
 * region to the phone and the picker updates itself from the phone's subscription. On its own, the
 * picker holds the selection itself. No emit fires at construction; read the bootstrap with `getState`.
 */
export type RegionPicker<T = undefined> = {
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: RegionPickerListener<T>): () => void;
  /** Read the current state without subscribing. */
  getState(): RegionPickerState<T>;

  /** Show the list with an empty query and the cursor on the selected row, or on the first row when the selection is not among the rows. A no-op while open. */
  open(): void;
  /** Hide the list and clear the cursor. A no-op while closed. */
  close(): void;
  /** `open` while closed, `close` while open. */
  toggle(): void;

  /** Update the query on `regions`. While open, the cursor moves to the first row. An unchanged query is a no-op. */
  search(query: string): void;
  /** Put the cursor on a row, or clear it with `null`. A region outside `options` clears it. */
  setActive(region: RegionCode | null): void;
  /** Move the cursor by `step` rows, wrapping at both ends. Without a cursor, a positive step starts at the first row and a negative one at the last. */
  moveActive(step: number): void;
  /** Select a region. Bound to a phone, the phone receives the region; on its own, the picker keeps it. Closing the list stays with the caller. */
  select(region: RegionCode): void;

  /** Unsubscribe from `regions` and the phone and clear all listeners. Idempotent. Destroy the picker before or together with the phone. */
  destroy(): void;
};
