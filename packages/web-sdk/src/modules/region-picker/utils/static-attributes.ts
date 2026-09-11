import type { RegionCode } from '@telixon/core';
import {
  ARIA_AUTOCOMPLETE_ATTRIBUTE,
  ARIA_CONTROLS_ATTRIBUTE,
  ARIA_HAS_POPUP_ATTRIBUTE,
  COMBOBOX_ROLE,
  LIST_AUTOCOMPLETE,
  LISTBOX_POPUP,
  LISTBOX_ROLE,
  OPTION_ROLE,
  ROLE_ATTRIBUTE,
} from '../constants/aria';
import { REGION_DATA_KEY } from '../constants/data-attributes';
import { BUTTON_TYPE, OUT_OF_TAB_ORDER, TYPE_ATTRIBUTE } from '../constants/html';
import { setRowSelected } from './live-attributes';

// The attributes written once per element. They describe the parts.

/** The trigger announces the listbox it opens. Without a `type` of its own it becomes a plain button. */
export function markTrigger(trigger: HTMLButtonElement, listboxId: string): void {
  if (!trigger.hasAttribute(TYPE_ATTRIBUTE)) trigger.type = BUTTON_TYPE;
  trigger.setAttribute(ARIA_HAS_POPUP_ATTRIBUTE, LISTBOX_POPUP);
  trigger.setAttribute(ARIA_CONTROLS_ATTRIBUTE, listboxId);
}

/** The host carries the combobox role and, while the list is open, the active descendant. */
export function markComboboxHost(host: HTMLElement, listboxId: string): void {
  host.setAttribute(ROLE_ATTRIBUTE, COMBOBOX_ROLE);
  host.setAttribute(ARIA_CONTROLS_ATTRIBUTE, listboxId);
}

export function markSearchField(search: HTMLInputElement): void {
  search.setAttribute(ARIA_AUTOCOMPLETE_ATTRIBUTE, LIST_AUTOCOMPLETE);
}

export function markListbox(listbox: HTMLElement, id: string): void {
  listbox.id = id;
  listbox.setAttribute(ROLE_ATTRIBUTE, LISTBOX_ROLE);
  listbox.tabIndex = OUT_OF_TAB_ORDER;
}

export function markOptionRow(row: HTMLElement, id: string, region: RegionCode): void {
  row.id = id;
  row.setAttribute(ROLE_ATTRIBUTE, OPTION_ROLE);
  row.dataset[REGION_DATA_KEY] = region;
  setRowSelected(row, false);
}

/** The region a rendered row stands for. */
export function regionOfRow(row: HTMLElement): RegionCode {
  return row.dataset[REGION_DATA_KEY] as RegionCode;
}
