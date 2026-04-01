import { InputControllerState, InputState } from "../models";

export const toInputState = (state: InputControllerState): InputState => {
  return {
    value: state.value,
    selectionStart: state.selectionStart,
    selectionEnd: state.selectionEnd,
  };
};
