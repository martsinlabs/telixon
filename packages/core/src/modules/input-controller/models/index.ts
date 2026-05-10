import { CallingCodeLayer, GraphLayer } from '@telixon/core/engine';
import { NumberTypeProfileRef } from '../../number-resolver/models';

export interface InputState {
  value: string;
  country: string | null;
  selectionStart: number;
  selectionEnd: number;
}

export interface InputControllerState extends InputState {
  state: number;
  terminalStates: number[];
  profileRef: NumberTypeProfileRef | null;
  formatIndex: number | null;
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

export type CaretIndex = number;

export abstract class InputController {
  abstract insert(value: string, text: string, selectionStart: number, selectionEnd: number): InputState;

  abstract deleteBackward(value: string, selectionStart: number, selectionEnd: number): InputState;

  abstract deleteForward(value: string, selectionStart: number, selectionEnd: number): InputState;

  abstract setValue(value: string): InputState;

  abstract setCountry(country: string): InputState;

  abstract undo(): InputState;

  abstract redo(): InputState;

  abstract setCountryFilter(countries: string[] | null): void;

  abstract setNumberTypeFilter(numberTypes: string[] | null): void;

  abstract seal(): void;

  abstract get canUndo(): boolean;

  abstract get canRedo(): boolean;

  abstract get currentState(): InputState;
}
