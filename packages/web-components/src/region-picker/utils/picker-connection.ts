import type { NumberType, RegionCode } from '@telixon/core';
import {
  attachRegionPicker,
  createRegionList,
  createRegionPicker,
  type PhoneInput,
  type RegionList,
  type RegionListSort,
  type RegionOption,
  type RegionPicker,
  type RegionPickerAttachment,
  type RegionPickerState,
} from '@telixon/web-sdk';
import type { TelixonRenderOption } from '../models';
import type { PickerMarkup } from './picker-markup';

/** The options a region list takes only at construction. */
export type PickerListOptions = {
  readonly sort: RegionListSort;
  readonly prioritize: readonly RegionCode[];
};

/** What the attachment renders with. A change needs a new attachment. */
export type PickerRenderers = {
  readonly renderOption: TelixonRenderOption;
  readonly renderEmpty: () => HTMLElement;
  readonly renderTrigger: (selected: RegionOption | null) => void;
};

export type PickerConnectionOptions = {
  /** Gets every state the picker reports, after the attachment has rendered it. */
  onState: (state: RegionPickerState) => void;
};

/** A web-sdk region picker wired to the element's markup over a phone widget. */
export type PickerConnection = {
  /** The widget, `null` while no phone input is connected. */
  picker(): RegionPicker | null;
  /** The latest state the widget reported, `null` while no phone input is connected. */
  state(): RegionPickerState | null;
  /**
   * Build the list, the widget, and the attachment over a phone input. Focus goes to `returnFocusTo`
   * after a pick, which is the phone field. An open list stays open with its query. A `null` phone only disconnects.
   */
  connect(
    phone: PhoneInput | null,
    markup: PickerMarkup,
    listOptions: PickerListOptions,
    renderers: PickerRenderers,
    returnFocusTo: HTMLElement | null,
  ): void;
  /** Narrow the list. The filters survive a reconnect. */
  filter(regions: readonly RegionCode[] | null, numberTypes: readonly NumberType[] | null): void;
  /** Name the regions in a locale. The locale survives a reconnect. */
  localize(locale: string): void;
  /** Take the picker down. The markup stays, closed. Idempotent. */
  disconnect(): void;
};

export function createPickerConnection(initialLocale: string, options: PickerConnectionOptions): PickerConnection {
  const { onState } = options;
  let picker: RegionPicker | null = null;
  let state: RegionPickerState | null = null;
  let list: RegionList | null = null;
  let attachment: RegionPickerAttachment | null = null;
  let unsubscribe: (() => void) | null = null;
  let regionFilter: readonly RegionCode[] | null = null;
  let numberTypeFilter: readonly NumberType[] | null = null;
  let locale: string = initialLocale;

  function disconnect(): void {
    // Closing first lets the attachment hide the popup before it stops listening.
    picker?.close();
    unsubscribe?.();
    unsubscribe = null;
    attachment?.destroy();
    attachment = null;
    picker?.destroy();
    picker = null;
    list?.destroy();
    list = null;
    state = null;
  }

  return {
    picker: (): RegionPicker | null => picker,
    state: (): RegionPickerState | null => state,

    connect(
      phone: PhoneInput | null,
      markup: PickerMarkup,
      listOptions: PickerListOptions,
      renderers: PickerRenderers,
      returnFocusTo: HTMLElement | null,
    ): void {
      const openQuery: string | null = state !== null && state.open ? state.searchQuery : null;
      disconnect();
      if (phone === null) return;

      const regions: RegionList = createRegionList({ ...listOptions, locale, regionFilter, numberTypeFilter });
      const widget: RegionPicker = createRegionPicker({ regions, phone });
      // The attachment renders first on every state, which the element's own listener relies on.
      const widgetAttachment: RegionPickerAttachment = attachRegionPicker({
        picker: widget,
        trigger: markup.trigger,
        popup: markup.popup,
        listbox: markup.listbox,
        search: markup.search,
        ...(returnFocusTo === null ? {} : { returnFocusTo }),
        renderOption: renderers.renderOption,
        renderEmpty: renderers.renderEmpty,
        renderTrigger: renderers.renderTrigger,
        autoFocus: false,
      });
      list = regions;
      picker = widget;
      attachment = widgetAttachment;
      unsubscribe = widget.subscribe((widgetState: RegionPickerState): void => {
        state = widgetState;
        onState(widgetState);
      });
      state = widget.getState();
      if (openQuery !== null) {
        widget.open();
        widget.search(openQuery);
      }
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

    disconnect,
  };
}
