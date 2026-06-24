import type { InputState, NumberType, RegionCode, ValidationError } from '@telixon/core';
import type { PhoneInputState } from '../models';

export function deriveState(
  inputState: InputState,
  regionFilter: readonly RegionCode[] | null,
  numberTypeFilter: readonly NumberType[] | null,
  placeholder: string | null,
  validationError: ValidationError | null,
): PhoneInputState {
  return {
    value: inputState.value,
    region: inputState.region,
    selectionStart: inputState.selectionStart,
    selectionEnd: inputState.selectionEnd,
    regionFilter,
    numberTypeFilter,
    placeholder,
    validationError,
  };
}
