import type { RegionCode } from '@telixon/core';
import { regionRowSelector, ROW_SELECTOR } from '../constants/data-attributes';

// Rows are found through the DOM, which leaves the caller free to render them however it likes.

/** The row an event target lies in, while the row belongs to the listbox. */
export function rowAt(listbox: HTMLElement, target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const row: Element | null = target.closest(ROW_SELECTOR);
  return row instanceof HTMLElement && listbox.contains(row) ? row : null;
}

/** The row a region is currently shown in. */
export function rowForRegion(listbox: HTMLElement, region: RegionCode): HTMLElement | null {
  return listbox.querySelector<HTMLElement>(regionRowSelector(region));
}
