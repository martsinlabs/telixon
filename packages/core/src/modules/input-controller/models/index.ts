export interface InputState {
  value: string;
  country: string | null;
  selectionStart: number;
  selectionEnd: number;
}

export interface InputControllerState extends InputState {
  graphStateId: number;
}

export abstract class InputController {
  abstract insert(
    value: string,
    text: string,
    selectionStart: number,
    selectionEnd: number
  ): InputState;

  abstract deleteBackward(
    value: string,
    selectionStart: number,
    selectionEnd: number
  ): InputState;

  abstract deleteForward(
    value: string,
    selectionStart: number,
    selectionEnd: number
  ): InputState;

  abstract setValue(value: string): InputState;

  abstract setCountry(country: string): InputState;

  abstract undo(): InputState;

  abstract redo(): InputState;

  abstract get currentState(): InputState;
}
