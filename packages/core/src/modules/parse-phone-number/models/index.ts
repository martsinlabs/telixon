import { RegionCode } from '@telixon/core/engine';

export interface ParsePhoneNumberOptions {
  // Assumed region for input without a leading '+'.
  defaultRegion?: RegionCode;
  // Restrict validity (`isValid`/`getNumberType`) to `defaultRegion` (libphonenumber isValidNumberForRegion);
  // `getRegion`, `isPossible`, and `format*` ignore it. No effect without `defaultRegion`; off by default.
  strict?: boolean;
}
