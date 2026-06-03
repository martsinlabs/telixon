import type { InputState, NumberType, RegionId } from '@telixon/core';
import type { PhoneInputState } from '../models';

export function deriveState(
  inputState: InputState,
  countryFilter: readonly RegionId[] | null,
  numberTypeFilter: readonly NumberType[] | null,
  placeholder: string | null,
): PhoneInputState {
  return {
    value: inputState.value,
    country: inputState.country,
    selectionStart: inputState.selectionStart,
    selectionEnd: inputState.selectionEnd,
    countryFilter,
    numberTypeFilter,
    placeholder,
  };
}
