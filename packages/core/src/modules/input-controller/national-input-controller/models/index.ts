import { RegionCode } from '@telixon/core/engine';

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
