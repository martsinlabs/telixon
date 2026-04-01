export interface InputState {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface InputControllerState extends InputState {
  graphStateId: number;
}

export abstract class InputController {
  abstract insert(
    text: string,
    selectionStart: number,
    selectionEnd: number
  ): InputState;

  abstract deleteBackward(
    selectionStart: number,
    selectionEnd: number
  ): InputState;

  abstract deleteForward(
    selectionStart: number,
    selectionEnd: number
  ): InputState;

  abstract replaceAll(
    text: string,
    selectionStart: number,
    selectionEnd: number
  ): InputState;

  abstract undo(): InputState | undefined;

  abstract redo(): InputState | undefined;
}
