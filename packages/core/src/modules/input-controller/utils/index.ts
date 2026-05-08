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
