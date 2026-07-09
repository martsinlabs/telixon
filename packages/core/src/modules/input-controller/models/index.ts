import { NumberType, RegionCode } from '@telixon/core/engine';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../number-resolver/models';
import { PhoneNumber } from '../../phone-number/models';

export interface InputState {
  readonly value: string;
  readonly region: RegionCode | null;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

export interface InputControllerState extends InputState {
  readonly snapshot: NumberResolverSnapshot;
  readonly profileRef: NumberTypeProfileRef | null;
  readonly formatIndex: number | null;
  readonly nationalPrefixPresent: boolean;
  readonly plusErased: boolean;
}

export interface InputChange {
  readonly insertText: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

export type CaretIndex = number;

export interface InputController {
  insert(value: string, text: string, selectionStart: number, selectionEnd: number): InputState;
  deleteBackward(value: string, selectionStart: number, selectionEnd: number): InputState;
  deleteForward(value: string, selectionStart: number, selectionEnd: number): InputState;
  setValue(value: string): InputState;
  setRegion(region: RegionCode): InputState;
  undo(): InputState;
  redo(): InputState;
  setRegionFilter(regions: readonly RegionCode[] | null): InputState;
  setNumberTypeFilter(numberTypes: readonly NumberType[] | null): InputState;
  clearHistory(): void;
  getPhoneNumber(): PhoneNumber;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly currentState: InputState;
}
