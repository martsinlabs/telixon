import { getCallingCodePrimaryRegion } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// Calling code's main region (libphonenumber checks possible lengths against it); the default country for national-only input.
export function resolvePrimaryCountryIndex(callingCodeState: number, defaultCountryIndex: number): number {
  if (callingCodeState === -1) return defaultCountryIndex;
  return getCallingCodePrimaryRegion(getResourceProvider().engine, callingCodeState);
}
