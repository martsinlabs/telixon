import type { RegionCode } from '@telixon/core';
import type { PhoneInput, PhoneInputState } from '../phone-input/models';
import type { RegionListState, RegionOption } from '../region-list/models';
import type { RegionPicker, RegionPickerListener, RegionPickerOptions, RegionPickerState } from './models';

/**
 * Create the headless widget behind a region picker.
 *
 * The picker reads its rows from `regions` and, when a `phone` is given, follows the phone's
 * resolved region. Every mutation emits at most once.
 */
export function createRegionPicker<T = undefined>(options: RegionPickerOptions<T>): RegionPicker<T> {
  const { regions } = options;
  const phone: PhoneInput | null = options.phone ?? null;

  const listeners: Set<RegionPickerListener<T>> = new Set();
  let listState: RegionListState<T> = regions.getState();
  let open: boolean = false;
  let selected: RegionOption<T> | null = null;
  let active: RegionCode | null = null;
  let cachedState: RegionPickerState<T> | null = null;
  let isDestroyed: boolean = false;

  // Nested mutations (an open that resets the list's query) collapse into one emit.
  let batchDepth: number = 0;
  let emitPending: boolean = false;

  function optionFor(region: RegionCode | null): RegionOption<T> | null {
    return region === null ? null : (regions.getOption(region) ?? null);
  }

  function rowIndexOf(region: RegionCode | null): number {
    if (region === null) return -1;
    const rows: readonly RegionOption<T>[] = listState.options;
    for (let index = 0; index < rows.length; index++) if (rows[index]!.region === region) return index;
    return -1;
  }

  function firstRow(): RegionCode | null {
    return listState.options[0]?.region ?? null;
  }

  function buildState(): RegionPickerState<T> {
    if (cachedState !== null) return cachedState;
    cachedState = { open, selected, active, options: listState.options, searchQuery: listState.searchQuery };
    return cachedState;
  }

  function emit(): void {
    cachedState = null;
    if (isDestroyed) return;
    if (batchDepth > 0) {
      emitPending = true;
      return;
    }
    const state: RegionPickerState<T> = buildState();
    for (const listener of listeners) listener(state);
  }

  function batch(run: () => void): void {
    batchDepth++;
    try {
      run();
    } finally {
      batchDepth--;
      if (batchDepth === 0 && emitPending) {
        emitPending = false;
        emit();
      }
    }
  }

  const unsubscribeList: () => void = regions.subscribe((state) => {
    listState = state;
    // The base set may have been recomputed (localize, refresh); the selection follows it.
    if (selected !== null) selected = optionFor(selected.region);
    // A new row set moves the cursor to the first row, which lets Enter pick the top match.
    active = open ? firstRow() : null;
    emit();
  });

  // An unresolved value keeps the last shown region.
  function followPhone(state: PhoneInputState): void {
    if (state.region === null || state.region === selected?.region) return;
    selected = optionFor(state.region);
    emit();
  }

  const unsubscribePhone: (() => void) | null = phone === null ? null : phone.subscribe(followPhone);

  if (phone !== null) followPhone(phone.getState());

  function openList(): void {
    if (open) return;
    batch(() => {
      open = true;
      regions.search('');
      active = selected !== null && rowIndexOf(selected.region) !== -1 ? selected.region : firstRow();
      emit();
    });
  }

  function closeList(): void {
    if (!open) return;
    open = false;
    active = null;
    emit();
  }

  function setCursor(region: RegionCode | null): void {
    if (region === active) return;
    active = region;
    emit();
  }

  return {
    subscribe(listener: RegionPickerListener<T>): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getState(): RegionPickerState<T> {
      return buildState();
    },

    open: openList,

    close: closeList,

    toggle(): void {
      if (open) closeList();
      else openList();
    },

    search(query: string): void {
      regions.search(query);
    },

    setActive(region: RegionCode | null): void {
      setCursor(rowIndexOf(region) === -1 ? null : region);
    },

    moveActive(step: number): void {
      const rows: readonly RegionOption<T>[] = listState.options;
      const count: number = rows.length;
      if (count === 0 || step === 0) return;
      const index: number = rowIndexOf(active);
      const nextIndex: number = index === -1 ? (step > 0 ? 0 : count - 1) : (((index + step) % count) + count) % count;
      setCursor(rows[nextIndex]!.region);
    },

    select(region: RegionCode): void {
      if (phone !== null) {
        phone.setRegion(region);
        return;
      }
      const option: RegionOption<T> | null = optionFor(region);
      if (option === null || option === selected) return;
      selected = option;
      emit();
    },

    destroy(): void {
      if (isDestroyed) return;
      isDestroyed = true;
      unsubscribeList();
      unsubscribePhone?.();
      listeners.clear();
    },
  };
}
