import { RegionCode } from '@telixon/core/engine';
import { InputControllerState } from '../../models';
import { DigitAlignment } from '../utils/digit-alignment';

/** National controller state; carries the typed digit stream as the source of truth behind the rendered value. */
export interface NationalControllerState extends InputControllerState {
  /** The digits the user actually typed; rendering derives from them and never feeds back. */
  readonly rawDigits: string;
  /** Caret position inside `rawDigits`. */
  readonly rawCaretIndex: number;
  /** Alignment between `rawDigits` and the rendered digit characters; `null` when they coincide. */
  readonly alignment: DigitAlignment | null;
}

/** Config for {@link createNationalInputController}. `defaultRegion` is required: the field holds one region's national number. */
export interface NationalInputControllerConfig {
  /** The region the field formats for. */
  defaultRegion: RegionCode;
  /** Restricts validity to `defaultRegion`, as in {@link ParsePhoneNumberOptions}. */
  strict?: boolean;
  /** Seeds the field with a starting value. */
  initialValue?: string;
  /** Bounds the undo and redo history. */
  maxHistorySize?: number;
}
