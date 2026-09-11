import type { RegionCode } from '@telixon/core';
import { NEXT_ROW_STEP, PREVIOUS_ROW_STEP } from '../constants/cursor';
import { ARROW_DOWN_KEY, ARROW_UP_KEY, ENTER_KEY, ESCAPE_KEY } from '../constants/keys';
import type { RegionPicker, RegionPickerState } from '../models';
import type { PickerRenderer } from './picker-renderer';

export type KeyboardHandlerOptions<T> = {
  picker: RegionPicker<T>;
  renderer: PickerRenderer<T>;
  trigger: HTMLButtonElement;
  pick: (region: RegionCode) => void;
};

/**
 * The keys of a combobox. Arrows open a closed list and move the cursor in an open one. With the
 * list open, Enter picks the cursor's row while Escape hands focus to the trigger and closes.
 */
export function createKeyboardHandler<T>(options: KeyboardHandlerOptions<T>): (event: KeyboardEvent) => void {
  const { picker, renderer, trigger, pick } = options;

  function handleArrow(event: KeyboardEvent, step: number, open: boolean): void {
    event.preventDefault();
    if (!open) {
      picker.open();
      return;
    }
    picker.moveActive(step);
    renderer.revealCursor();
  }

  function handleEnter(event: KeyboardEvent, state: RegionPickerState<T>): void {
    // Enter must never submit a surrounding form while the list is open.
    event.preventDefault();
    if (state.active !== null) pick(state.active);
  }

  // Focus moves before the list closes, which never leaves it inside a hidden popup.
  function handleEscape(event: KeyboardEvent): void {
    event.preventDefault();
    trigger.focus({ preventScroll: true });
    picker.close();
  }

  return (event: KeyboardEvent): void => {
    if (event.isComposing) return;
    const state: RegionPickerState<T> = picker.getState();

    switch (event.key) {
      case ARROW_DOWN_KEY:
        handleArrow(event, NEXT_ROW_STEP, state.open);
        return;
      case ARROW_UP_KEY:
        handleArrow(event, PREVIOUS_ROW_STEP, state.open);
        return;
      case ENTER_KEY:
        if (state.open) handleEnter(event, state);
        return;
      case ESCAPE_KEY:
        if (state.open) handleEscape(event);
        return;
      default:
        return;
    }
  };
}
