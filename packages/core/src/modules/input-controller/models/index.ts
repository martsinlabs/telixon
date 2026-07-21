import { NumberType, RegionCode } from '@telixon/core/engine';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../number-resolver/models';
import { PhoneNumber } from '../../phone-number/models';

/** The next value and caret to apply to the field. Returned by every mutating {@link InputController} method. */
export interface InputState {
  /** The formatted string to place in the field. */
  readonly value: string;
  /** The region the value resolves to, or `null` when none does; a field with no digits reports the configured default region. */
  readonly region: RegionCode | null;
  /** Caret start, as an index into `value`. */
  readonly selectionStart: number;
  /** Caret end. Equal to `selectionStart` unless a range is selected. */
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

/**
 * A state controller for a phone-number field. Every state-changing call returns the next
 * {@link InputState} to write back. Holds the region, the filters, and the history.
 */
export interface InputController {
  /** Replaces the selection from `selectionStart` to `selectionEnd` in `value` with `text`, then reformats. */
  insert(value: string, text: string, selectionStart: number, selectionEnd: number): InputState;
  /** Deletes the selection, or the character before the caret when it is empty, then reformats. */
  deleteBackward(value: string, selectionStart: number, selectionEnd: number): InputState;
  /** Deletes the selection, or the character after the caret when it is empty, then reformats. */
  deleteForward(value: string, selectionStart: number, selectionEnd: number): InputState;
  /** Replaces the whole value and reformats, as for a paste or a programmatic set. */
  setValue(value: string): InputState;
  /** Switches to `region` and reformats the current digits the way that region writes them. */
  setRegion(region: RegionCode): InputState;
  /** Steps back to the previous state in history. */
  undo(): InputState;
  /** Steps forward again after an {@link InputController.undo}. */
  redo(): InputState;
  /** Restricts which regions the value may resolve to, or `null` to allow all. */
  setRegionFilter(regions: readonly RegionCode[] | null): InputState;
  /** Restricts which number types the value may resolve to, or `null` to allow all. */
  setNumberTypeFilter(numberTypes: readonly NumberType[] | null): InputState;
  /** Drops the undo and redo history. */
  clearHistory(): void;
  /** The current value as a {@link PhoneNumber} to query. */
  getPhoneNumber(): PhoneNumber;
  /** Whether there is history to {@link InputController.undo}. */
  readonly canUndo: boolean;
  /** Whether there is history to {@link InputController.redo}. */
  readonly canRedo: boolean;
  /** The value and caret as they stand, without mutating. */
  readonly currentState: InputState;
}
