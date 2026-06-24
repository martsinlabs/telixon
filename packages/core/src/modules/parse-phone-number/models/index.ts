import { RegionCode } from '@telixon/core/engine';

export interface ParsePhoneNumberOptions {
  // Region used to read a number that has no leading '+'. Ignored when the input starts with '+'.
  defaultRegion?: RegionCode;
}
