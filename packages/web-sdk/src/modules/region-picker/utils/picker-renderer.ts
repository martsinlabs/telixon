import type { RegionOption } from '../../region-list/models';
import type { RegionPickerState } from '../models';
import { setActiveDescendant, setExpanded, setRowActive, setRowSelected } from './live-attributes';
import type { OptionRows } from './option-rows';
import { scrollRowIntoView } from './scroll-row-into-view';

export type PickerRendererOptions<T> = {
  trigger: HTMLButtonElement;
  popup: HTMLElement;
  host: HTMLElement;
  search: HTMLInputElement | null;
  listbox: HTMLElement;
  rows: OptionRows<T>;
  renderTrigger: ((selected: RegionOption<T> | null) => void) | null;
  autoFocus: boolean;
};

/** Writes picker state to the DOM. Every part of the state is written only when it changed. */
export type PickerRenderer<T> = {
  render(state: RegionPickerState<T>): void;
  /** Scroll the cursor's row into view inside the listbox. */
  revealCursor(): void;
};

export function createPickerRenderer<T>(options: PickerRendererOptions<T>): PickerRenderer<T> {
  const { trigger, popup, host, search, listbox, rows, renderTrigger, autoFocus } = options;

  let renderedOptions: readonly RegionOption<T>[] | null = null;
  // `undefined` until the first render, which lets renderTrigger run on attach for an empty selection.
  let renderedSelected: RegionOption<T> | null | undefined = undefined;
  let renderedOpen: boolean | null = null;
  let selectedRow: HTMLElement | null = null;
  let activeRow: HTMLElement | null = null;

  function renderRows(state: RegionPickerState<T>): void {
    if (state.options === renderedOptions) return;
    rows.render(state.options);
    renderedOptions = state.options;
  }

  function renderSelection(state: RegionPickerState<T>): void {
    if (state.selected !== renderedSelected) {
      renderedSelected = state.selected;
      renderTrigger?.(state.selected);
    }

    // The selected row is tracked by element, which covers a row rendered after the selection changed.
    const nextRow: HTMLElement | null = state.selected === null ? null : rows.rowOf(state.selected);
    if (nextRow === selectedRow) return;
    if (selectedRow !== null) setRowSelected(selectedRow, false);
    selectedRow = nextRow;
    if (selectedRow !== null) setRowSelected(selectedRow, true);
  }

  function renderCursor(state: RegionPickerState<T>): void {
    const nextRow: HTMLElement | null = state.active === null ? null : rows.rowForRegion(state.active);
    if (nextRow === activeRow) return;
    if (activeRow !== null) setRowActive(activeRow, false);
    activeRow = nextRow;
    if (activeRow !== null) setRowActive(activeRow, true);
    setActiveDescendant(host, activeRow === null ? null : activeRow.id);
  }

  function renderQuery(state: RegionPickerState<T>): void {
    if (search !== null && search.value !== state.searchQuery) search.value = state.searchQuery;
  }

  function revealCursor(): void {
    if (activeRow !== null) scrollRowIntoView(listbox, activeRow);
  }

  function renderVisibility(state: RegionPickerState<T>): void {
    if (state.open === renderedOpen) return;
    renderedOpen = state.open;
    popup.hidden = !state.open;
    setExpanded(trigger, state.open);
    setExpanded(host, state.open);
    if (!state.open) return;

    listbox.scrollTop = 0;
    revealCursor();
    if (autoFocus && search !== null) search.focus({ preventScroll: true });
  }

  function render(state: RegionPickerState<T>): void {
    renderRows(state);
    renderSelection(state);
    renderCursor(state);
    renderQuery(state);
    renderVisibility(state);
  }

  return { render, revealCursor };
}
