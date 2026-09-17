import type { RegionCode } from '@telixon/core';
import type { RegionOption } from '../../region-list/models';
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
};

export function createOptionRows<T>(options: OptionRowsOptions<T>): OptionRows<T> {
  const { listbox, renderOption, renderEmpty, optionId } = options;

  // Keyed by option object. A new base set after localize or refresh brings new objects and new rows.
  const rowByOption: WeakMap<RegionOption<T>, HTMLElement> = new WeakMap();

  function rowFor(option: RegionOption<T>): HTMLElement {
    const existing: HTMLElement | undefined = rowByOption.get(option);
    if (existing !== undefined) return existing;

    const row: HTMLElement = renderOption(option);
    markOptionRow(row, optionId(option.region), option.region);
    rowByOption.set(option, row);
    return row;
  }

  function render(rows: readonly RegionOption<T>[]): void {
    if (rows.length === 0) {
      listbox.replaceChildren(...(renderEmpty === null ? [] : [renderEmpty()]));
      return;
    }

    const elements: HTMLElement[] = new Array(rows.length);
    for (let index = 0; index < rows.length; index++) elements[index] = rowFor(rows[index]!);
    listbox.replaceChildren(...elements);
  }

  return { render };
}
