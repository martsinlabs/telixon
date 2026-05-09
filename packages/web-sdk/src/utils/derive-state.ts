import type { InputState } from '@telixon/core';
import type { PhoneInputState } from '../models';

export function deriveState(inputState: InputState): PhoneInputState {
  return {
    value: inputState.value,
    country: inputState.country,
    selectionStart: inputState.selectionStart,
    selectionEnd: inputState.selectionEnd,
  };
}
