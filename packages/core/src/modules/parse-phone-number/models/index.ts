import { RegionCode } from '@telixon/core/engine';

export interface ParsePhoneNumberOptions {
  // Assumed region for input without a leading '+'.
  defaultRegion?: RegionCode;
  // Validate against `defaultRegion` only (libphonenumber isValidNumberForRegion); off by default.
  strict?: boolean;
}
