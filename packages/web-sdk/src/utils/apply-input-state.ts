import type { PhoneInputState } from '../models';

export function applyInputState(input: HTMLInputElement, state: PhoneInputState): void {
  input.value = state.value;

  input.setSelectionRange(state.selectionStart, state.selectionEnd);
}
