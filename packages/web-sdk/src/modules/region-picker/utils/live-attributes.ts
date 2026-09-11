import { ARIA_ACTIVE_DESCENDANT_ATTRIBUTE, ARIA_EXPANDED_ATTRIBUTE, ARIA_SELECTED_ATTRIBUTE } from '../constants/aria';
import { ACTIVE_DATA_KEY, ACTIVE_DATA_VALUE } from '../constants/data-attributes';

// The attributes that follow the picker state.

export function setExpanded(element: HTMLElement, expanded: boolean): void {
  element.setAttribute(ARIA_EXPANDED_ATTRIBUTE, String(expanded));
}

export function setRowSelected(row: HTMLElement, selected: boolean): void {
  row.setAttribute(ARIA_SELECTED_ATTRIBUTE, String(selected));
}

export function setRowActive(row: HTMLElement, active: boolean): void {
  if (active) row.dataset[ACTIVE_DATA_KEY] = ACTIVE_DATA_VALUE;
  else delete row.dataset[ACTIVE_DATA_KEY];
}

export function setActiveDescendant(host: HTMLElement, rowId: string | null): void {
  if (rowId === null) host.removeAttribute(ARIA_ACTIVE_DESCENDANT_ATTRIBUTE);
  else host.setAttribute(ARIA_ACTIVE_DESCENDANT_ATTRIBUTE, rowId);
}
