import { RegionCode } from '@telixon/core/engine';

/** Options for {@link parsePhoneNumber}. */
export interface ParsePhoneNumberOptions {
  /** The region to resolve input against when it has no leading `+`. */
  defaultRegion?: RegionCode;
  /**
   * Restricts `isValid` and `getNumberType` to `defaultRegion`. Other methods ignore it. No effect
   * without `defaultRegion`; off by default.
   */
  strict?: boolean;
}
