import type { RegionCode } from '@telixon/core';
import { listen } from '../../../utils/listen';
import type { RegionPicker } from '../models';
import { createKeyboardHandler } from './keyboard-handler';
import type { OptionRows } from './option-rows';
import type { PickerRenderer } from './picker-renderer';
import { regionOfRow } from './static-attributes';

export type PickerEventsOptions<T> = {
  picker: RegionPicker<T>;
  trigger: HTMLButtonElement;
  popup: HTMLElement;
  search: HTMLInputElement | null;
  listbox: HTMLElement;
  rows: OptionRows<T>;
  renderer: PickerRenderer<T>;
  returnFocusTo: HTMLElement;
};

/** Wire the DOM events of a picker. Returns the function that removes every listener. */
export function bindPickerEvents<T>(options: PickerEventsOptions<T>): () => void {
  const { picker, trigger, popup, search, listbox, rows, renderer, returnFocusTo } = options;

  // The picker's own ground is the trigger and the popup, wherever the popup lives in the document.
  function isInside(target: EventTarget | null): boolean {
    return target instanceof Node && (trigger.contains(target) || popup.contains(target));
  }

  // Focus moves before the list closes, which never leaves it inside a hidden popup.
  function pick(region: RegionCode): void {
    picker.select(region);
    returnFocusTo.focus({ preventScroll: true });
    picker.close();
  }

  // Safari leaves focus in the search field on a button press. A closing press with focus still inside the popup takes it back to the trigger.
  function handleTriggerClick(): void {
    if (picker.getState().open && popup.contains(document.activeElement)) trigger.focus({ preventScroll: true });
    picker.toggle();
  }

  // Focus stays where it is while a row is pressed. The click that follows does the picking.
  function handleRowPress(event: MouseEvent): void {
    event.preventDefault();
  }

  function handleRowClick(event: MouseEvent): void {
    const row: HTMLElement | null = rows.rowAt(event.target);
    if (row !== null) pick(regionOfRow(row));
  }

  // A list scrolling under a resting pointer must not move the cursor, which rules out pointerover.
  function handlePointerMove(event: PointerEvent): void {
    const row: HTMLElement | null = rows.rowAt(event.target);
    if (row !== null) picker.setActive(regionOfRow(row));
  }

  function handleOutsidePress(event: PointerEvent): void {
    if (picker.getState().open && !isInside(event.target)) picker.close();
  }

  // A null relatedTarget names no destination, as after a press on a non-focusable spot or a window blur. Presses belong to handleOutsidePress. The list stays open otherwise.
  function handleFocusLeave(event: FocusEvent): void {
    if (event.relatedTarget === null || isInside(event.relatedTarget) || !picker.getState().open) return;
    picker.close();
  }

  const handleKeydown: (event: KeyboardEvent) => void = createKeyboardHandler({ picker, renderer, trigger, pick });

  const unlisteners: (() => void)[] = [
    listen(trigger, 'click', handleTriggerClick),
    listen(trigger, 'keydown', handleKeydown),
    listen(trigger, 'focusout', handleFocusLeave),
    listen(popup, 'focusout', handleFocusLeave),
    listen(listbox, 'mousedown', handleRowPress),
    listen(listbox, 'click', handleRowClick),
    listen(listbox, 'pointermove', handlePointerMove),
    // The capture phase sees a press even when a handler on the pressed element stops propagation.
    listen(document, 'pointerdown', handleOutsidePress, { capture: true }),
  ];

  if (search !== null) {
    unlisteners.push(
      listen(search, 'keydown', handleKeydown),
      listen(search, 'input', () => picker.search(search.value)),
    );
  }

  return (): void => {
    for (const unlisten of unlisteners) unlisten();
  };
}
