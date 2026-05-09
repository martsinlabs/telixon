import type { PhoneInputState } from '../models';
import { assertTextInputType } from './assert-text-input-type';

function shouldUpdateSelection(input: HTMLInputElement, state: PhoneInputState): boolean {
  return input.selectionStart !== state.selectionStart || input.selectionEnd !== state.selectionEnd;
}

export function applyInputState(input: HTMLInputElement, state: PhoneInputState): void {
  assertTextInputType(input);

  if (input.value !== state.value) {
    input.value = state.value;
  }

  if (!shouldUpdateSelection(input, state)) return;

  input.setSelectionRange(state.selectionStart, state.selectionEnd);
}
