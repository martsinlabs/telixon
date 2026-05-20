import { InputControllerState, InputState } from '../models';

export { findNextDigitPosition, findPreviousDigitPosition, isFormattingChar } from './find-digit-position';

export const toInputState = (state: InputControllerState): InputState => {
  return {
    value: state.value,
    country: state.country,
    selectionStart: state.selectionStart,
    selectionEnd: state.selectionEnd,
  };
};

export const toInputStateWithSelection = (
  state: InputControllerState,
  selectionStart: number,
  selectionEnd: number,
): InputState => {
  return {
    value: state.value,
    country: state.country,
    selectionStart,
    selectionEnd,
  };
};
