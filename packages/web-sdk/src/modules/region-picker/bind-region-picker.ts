import type { RegionCode } from '@telixon/core';
import type { BindRegionPickerOptions, RegionPickerBinding, RegionPickerElementIds } from './models';
import { bindPickerEvents } from './utils/bind-picker-events';
import { comboboxHost } from './utils/combobox-host';
import { createElementIds } from './utils/element-ids';
import { rowForRegion } from './utils/row-lookup';
import { scrollRowIntoView } from './utils/scroll-row-into-view';
import { markComboboxHost, markListbox, markSearchField, markTrigger } from './utils/static-attributes';

/**
 * Wire the behavior of a region picker to a trigger, a popup with an optional search field, and a
 * listbox whose rows the caller renders.
 *
 * Clicks, keys, typing, pointer moves, outside presses, and focus leaving flow in. The binding
 * writes the attributes that describe the parts once and no others. It moves focus after a pick
 * and on Escape, and it scrolls the cursor into view on the arrow keys.
 *
 * The rows and every attribute that follows the state stay with the caller, which covers `hidden`,
 * `aria-expanded`, `aria-selected`, `data-active`, `aria-activedescendant`, the search field's
 * value, and the focus it takes when the list opens. Each row carries `data-region` and the
 * binding's `ids.option(region)`.
 *
 * {@link attachRegionPicker} adds the rendering for a caller working with the DOM directly.
 */
export function bindRegionPicker<T = undefined>(options: BindRegionPickerOptions<T>): RegionPickerBinding {
  const { picker, trigger, popup, listbox } = options;
  const search: HTMLInputElement | null = options.search ?? null;
  const returnFocusTo: HTMLElement = options.returnFocusTo ?? trigger;
  const host: HTMLElement = comboboxHost(trigger, search);

  const ids: RegionPickerElementIds = createElementIds(listbox.id);
  markTrigger(trigger, ids.listbox);
  markComboboxHost(host, ids.listbox);
  if (search !== null) markSearchField(search);
  markListbox(listbox, ids.listbox);

  function revealCursor(): void {
    const active: RegionCode | null = picker.getState().active;
    const row: HTMLElement | null = active === null ? null : rowForRegion(listbox, active);
    if (row !== null) scrollRowIntoView(listbox, row);
  }

  const unbindEvents: () => void = bindPickerEvents({
    picker,
    trigger,
    popup,
    search,
    listbox,
    revealCursor,
    returnFocusTo,
  });

  let isDestroyed: boolean = false;

  return {
    ids,
    revealCursor,

    destroy(): void {
      if (isDestroyed) return;
      isDestroyed = true;
      unbindEvents();
    },
  };
}
