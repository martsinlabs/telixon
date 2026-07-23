import { RegionCode } from '@telixon/core/engine';

/** Options for {@link parsePhoneNumber}. */
export interface ParsePhoneNumberOptions {
  /** The region to resolve input against when it has no leading `+`. */
  defaultRegion?: RegionCode;
  /**
   * Restricts validity to `defaultRegion`; `isValid`, `getNumberType`, and `getValidationError`
   * follow it. No effect without `defaultRegion`; off by default.
   */
  strict?: boolean;
}
