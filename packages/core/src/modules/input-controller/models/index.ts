import { CallingCodeLayer, GraphLayer } from '@telixon/core/engine';

export interface InputState {
  value: string;
  country: string | null;
  selectionStart: number;
  selectionEnd: number;
}

export interface InputControllerState extends InputState {
  graphStateId: number;
}

export interface InputChange {
  insertText: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface InputResolveContext {
  graphLayer: GraphLayer;
  callingCodeLayer: CallingCodeLayer;
  callingCode?: {
    value: string;
    graphState: number;
  };
}

export interface InputSnapshot {
  graphState: number;
  callingCode: string;
  nationalNumber: string;
  caretPosition: number;
}

export abstract class InputController {
  abstract insert(value: string, text: string, selectionStart: number, selectionEnd: number): InputState;

  abstract deleteBackward(value: string, selectionStart: number, selectionEnd: number): InputState;

  abstract deleteForward(value: string, selectionStart: number, selectionEnd: number): InputState;

  abstract setValue(value: string): InputState;

  abstract setCountry(country: string): InputState;

  abstract undo(): InputState;

  abstract redo(): InputState;

  abstract get currentState(): InputState;
}
