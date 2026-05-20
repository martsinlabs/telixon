import { CallingCodeLayer, CountryId, GraphLayer, NumberType } from '@telixon/core/engine';
import { NumberTypeProfileRef } from '../../number-resolver/models';
import { PhoneNumber } from '../../phone-number/models';

export type { PhoneNumberValidationResult } from '../../phone-number/models';

export interface InputState {
  value: string;
  country: CountryId | null;
  selectionStart: number;
  selectionEnd: number;
}

export interface InputControllerState extends InputState {
  state: number;
  terminalStates: number[];
  nationalDigits: string;
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

  abstract setCountry(country: CountryId): InputState;

  abstract undo(): InputState;

  abstract redo(): InputState;

  abstract setCountryFilter(countries: CountryId[] | null): void;

  abstract setNumberTypeFilter(numberTypes: NumberType[] | null): void;

  abstract seal(): void;

  abstract getPhoneNumber(): PhoneNumber;

  abstract get canUndo(): boolean;

  abstract get canRedo(): boolean;

  abstract get currentState(): InputState;
}
