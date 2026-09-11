import type { RegionCode } from '@telixon/core';
import type { RegionOption } from '../../region-list/models';
import { ROW_SELECTOR } from '../constants/data-attributes';
import { markOptionRow } from './static-attributes';

export type OptionRowsOptions<T> = {
  listbox: HTMLElement;
  renderOption: (option: RegionOption<T>) => HTMLElement;
  renderEmpty: (() => HTMLElement) | null;
  optionId: (region: RegionCode) => string;
};

/** The row elements of a listbox, one per option object, kept for as long as the option lives. */
export type OptionRows<T> = {
  /** Show the rows of `options` in order. With none, show the empty element when one is given. */
  render(options: readonly RegionOption<T>[]): void;
  /** The row of an option, once one has been rendered for it. */
  rowOf(option: RegionOption<T>): HTMLElement | null;
  /** The row shown for a region, while the region is among the rendered options. */
  rowForRegion(region: RegionCode): HTMLElement | null;
  /** The rendered row an event target lies in. */
  rowAt(target: EventTarget | null): HTMLElement | null;
};

export function createOptionRows<T>(options: OptionRowsOptions<T>): OptionRows<T> {
  const { listbox, renderOption, renderEmpty, optionId } = options;

  // Keyed by option object. A new base set after localize or refresh brings new objects and new rows.
  const rowByOption: WeakMap<RegionOption<T>, HTMLElement> = new WeakMap();
  const rowByRegion: Map<RegionCode, HTMLElement> = new Map();

  function rowFor(option: RegionOption<T>): HTMLElement {
    const existing: HTMLElement | undefined = rowByOption.get(option);
    if (existing !== undefined) return existing;

    const row: HTMLElement = renderOption(option);
    markOptionRow(row, optionId(option.region), option.region);
    rowByOption.set(option, row);
    return row;
  }

  function render(rows: readonly RegionOption<T>[]): void {
    rowByRegion.clear();

    if (rows.length === 0) {
      listbox.replaceChildren(...(renderEmpty === null ? [] : [renderEmpty()]));
      return;
    }

    const elements: HTMLElement[] = new Array(rows.length);
    for (let index = 0; index < rows.length; index++) {
      const option: RegionOption<T> = rows[index]!;
      const row: HTMLElement = rowFor(option);
      rowByRegion.set(option.region, row);
      elements[index] = row;
    }
    listbox.replaceChildren(...elements);
  }

  function rowAt(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) return null;
    const row: Element | null = target.closest(ROW_SELECTOR);
    return row instanceof HTMLElement && listbox.contains(row) ? row : null;
  }

  return {
    render,
    rowOf: (option: RegionOption<T>): HTMLElement | null => rowByOption.get(option) ?? null,
    rowForRegion: (region: RegionCode): HTMLElement | null => rowByRegion.get(region) ?? null,
    rowAt,
  };
}
