import type { RegionCode } from '@telixon/core';
import { listen } from '../../../utils/listen';
import type { RegionPicker } from '../models';
import { createKeyboardHandler } from './keyboard-handler';
import { rowAt } from './row-lookup';
import { regionOfRow } from './static-attributes';

export type PickerEventsOptions<T> = {
  picker: RegionPicker<T>;
  trigger: HTMLButtonElement;
  popup: HTMLElement;
  search: HTMLInputElement | null;
  listbox: HTMLElement;
  revealCursor: () => void;
  returnFocusTo: HTMLElement;
};

/** Wire the DOM events of a picker. Returns the function that removes every listener. */
export function bindPickerEvents<T>(options: PickerEventsOptions<T>): () => void {
  const { picker, trigger, popup, search, listbox, revealCursor, returnFocusTo } = options;

  // The picker's own ground is the trigger and the popup, wherever the popup lives in the document.
  function isInside(target: EventTarget | null): boolean {
    return target instanceof Node && (trigger.contains(target) || popup.contains(target));
  }

  // A press inside a shadow root reaches the document retargeted to its host, past any `contains`.
  function pressedInside(event: Event): boolean {
    const path: readonly EventTarget[] = event.composedPath();
    if (path.length === 0) return isInside(event.target);
    return path.includes(trigger) || path.includes(popup);
  }

  // Focus moves before the list closes, which never leaves it inside a hidden popup.
  function pick(region: RegionCode): void {
    picker.select(region);
    returnFocusTo.focus({ preventScroll: true });
    picker.close();
  }

  // Safari never focuses a button on click, which leaves every key handler stranded. Focus moves
  // before the toggle, which keeps a caller's own move on open in charge.
  function handleTriggerClick(): void {
    if (document.activeElement !== trigger) trigger.focus({ preventScroll: true });
    picker.toggle();
  }

  // Focus stays where it is while a row is pressed. The click that follows does the picking.
  function handleRowPress(event: MouseEvent): void {
    event.preventDefault();
  }

  function handleRowClick(event: MouseEvent): void {
    const row: HTMLElement | null = rowAt(listbox, event.target);
    if (row !== null) pick(regionOfRow(row));
  }

  // A list scrolling under a resting pointer must not move the cursor, which rules out pointerover.
  function handlePointerMove(event: PointerEvent): void {
    const row: HTMLElement | null = rowAt(listbox, event.target);
    if (row !== null) picker.setActive(regionOfRow(row));
  }

  function handleOutsidePress(event: PointerEvent): void {
    if (picker.getState().open && !pressedInside(event)) picker.close();
  }

  // A null relatedTarget names no destination, as after a press on a non-focusable spot or a window blur. Presses belong to handleOutsidePress. The list stays open otherwise.
  function handleFocusLeave(event: FocusEvent): void {
    if (event.relatedTarget === null || isInside(event.relatedTarget) || !picker.getState().open) return;
    picker.close();
  }

  const handleKeydown: (event: KeyboardEvent) => void = createKeyboardHandler({ picker, revealCursor, trigger, pick });

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
