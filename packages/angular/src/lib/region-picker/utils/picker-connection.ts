import { signal, type Signal, type WritableSignal } from '@angular/core';
import type { NumberType, RegionCode } from '@telixon/core';
import {
  bindRegionPicker,
  createRegionList,
  createRegionPicker,
  type PhoneInput,
  type RegionList,
  type RegionListSort,
  type RegionPicker,
  type RegionPickerBinding,
  type RegionPickerElementIds,
  type RegionPickerState,
} from '@telixon/web-sdk';

export type PickerElements = {
  trigger: HTMLButtonElement;
  popup: HTMLElement;
  listbox: HTMLElement;
  search: HTMLInputElement;
  /** The element focused after a pick, which is the phone field. */
  returnFocusTo: HTMLElement;
};

/** The options a region list takes only at construction. */
export type PickerListOptions = {
  readonly sort: RegionListSort;
  readonly prioritize: readonly RegionCode[];
};

/** A web-sdk region picker wired to the component's elements and published through signals. */
export type PickerConnection = {
  /** The widget, `null` while no phone input is connected. */
  readonly picker: Signal<RegionPicker | null>;
  /** The latest state the widget reported, `null` while no phone input is connected. */
  readonly state: Signal<RegionPickerState | null>;
  /** The ids of the current binding, which the rows and `aria-activedescendant` use. */
  readonly ids: Signal<RegionPickerElementIds | null>;
  /**
   * Build the list, the widget, and the binding over a phone input. An open list stays open with its
   * query. A `null` phone only disconnects.
   */
  connect(phone: PhoneInput | null, elements: PickerElements, listOptions: PickerListOptions): void;
  /** Narrow the list. The filters survive a reconnect. */
  filter(regions: readonly RegionCode[] | null, numberTypes: readonly NumberType[] | null): void;
  /** Name the regions in a locale. The locale survives a reconnect. */
  localize(locale: string): void;
  /** Scroll the row under the cursor into view. */
  revealCursor(): void;
  /** Disconnect for good. Idempotent. */
  destroy(): void;
};

/** `initialLocale` names the regions until `localize` says otherwise. */
export function createPickerConnection(initialLocale: string): PickerConnection {
  const picker: WritableSignal<RegionPicker | null> = signal(null);
  const state: WritableSignal<RegionPickerState | null> = signal(null);
  const ids: WritableSignal<RegionPickerElementIds | null> = signal(null);
  let list: RegionList | null = null;
  let binding: RegionPickerBinding | null = null;
  let unsubscribe: (() => void) | null = null;
  let regionFilter: readonly RegionCode[] | null = null;
  let numberTypeFilter: readonly NumberType[] | null = null;
  let locale: string = initialLocale;
  let isDestroyed: boolean = false;

  function disconnect(): void {
    unsubscribe?.();
    unsubscribe = null;
    binding?.destroy();
    binding = null;
    picker()?.destroy();
    list?.destroy();
    list = null;
    picker.set(null);
    state.set(null);
    ids.set(null);
  }

  return {
    picker: picker.asReadonly(),
    state: state.asReadonly(),
    ids: ids.asReadonly(),

    connect(phone: PhoneInput | null, elements: PickerElements, listOptions: PickerListOptions): void {
      const current: RegionPickerState | null = state();
      const openQuery: string | null = current !== null && current.open ? current.searchQuery : null;
      disconnect();
      if (isDestroyed || phone === null) return;

      const regions: RegionList = createRegionList({ ...listOptions, locale, regionFilter, numberTypeFilter });
      const widget: RegionPicker = createRegionPicker({ regions, phone });
      const widgetBinding: RegionPickerBinding = bindRegionPicker({ picker: widget, ...elements });
      if (openQuery !== null) {
        widget.open();
        widget.search(openQuery);
      }

      list = regions;
      binding = widgetBinding;
      unsubscribe = widget.subscribe((widgetState: RegionPickerState): void => state.set(widgetState));
      picker.set(widget);
      ids.set(widgetBinding.ids);
      state.set(widget.getState());
    },

    filter(regions: readonly RegionCode[] | null, numberTypes: readonly NumberType[] | null): void {
      regionFilter = regions;
      numberTypeFilter = numberTypes;
      list?.setRegionFilter(regions);
      list?.setNumberTypeFilter(numberTypes);
    },

    localize(nextLocale: string): void {
      locale = nextLocale;
      list?.localize(nextLocale);
    },

    revealCursor(): void {
      binding?.revealCursor();
    },

    destroy(): void {
      if (isDestroyed) return;
      isDestroyed = true;
      disconnect();
    },
  };
}
