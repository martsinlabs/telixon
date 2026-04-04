import { InputControllerState, InputState } from "../models";

export const toInputState = (state: InputControllerState): InputState => {
  return {
    value: state.value,
    country: state.country,
    selectionStart: state.selectionStart,
    selectionEnd: state.selectionEnd,
  };
};
