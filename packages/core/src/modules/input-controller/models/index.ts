import { NumberType, RegionId } from '@telixon/core/engine';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../number-resolver/models';
import { PhoneNumber } from '../../phone-number/models';

export type { PhoneNumberValidationResult } from '../../phone-number/models';

export interface InputState {
  value: string;
  country: RegionId | null;
  selectionStart: number;
  selectionEnd: number;
}

export interface InputControllerState extends InputState {
  snapshot: NumberResolverSnapshot;
  profileRef: NumberTypeProfileRef | null;
  formatIndex: number | null;
  nationalPrefixPresent: boolean;
}

export interface InputChange {
  insertText: string;
  selectionStart: number;
  selectionEnd: number;
}

export type CaretIndex = number;

export abstract class InputController {
  abstract insert(value: string, text: string, selectionStart: number, selectionEnd: number): InputState;

  abstract deleteBackward(value: string, selectionStart: number, selectionEnd: number): InputState;

  abstract deleteForward(value: string, selectionStart: number, selectionEnd: number): InputState;

  abstract setValue(value: string): InputState;

  abstract setCountry(country: RegionId): InputState;

  abstract undo(): InputState;

  abstract redo(): InputState;

  abstract setCountryFilter(countries: readonly RegionId[] | null): void;

  abstract setNumberTypeFilter(numberTypes: readonly NumberType[] | null): void;

  abstract seal(): void;

  abstract getPhoneNumber(): PhoneNumber;

  abstract get canUndo(): boolean;

  abstract get canRedo(): boolean;

  abstract get currentState(): InputState;
}
