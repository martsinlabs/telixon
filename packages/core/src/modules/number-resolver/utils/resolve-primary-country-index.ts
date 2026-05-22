import { getCallingCodePrimaryRegion } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// libphonenumber checks possible lengths against the calling code's primary region, not the specific
// region a number resolves to. Falls back to the default country for national-only input.
export function resolvePrimaryCountryIndex(callingCodeState: number, defaultCountryIndex: number): number {
  if (callingCodeState === -1) return defaultCountryIndex;
  return getCallingCodePrimaryRegion(getResourceProvider().callingCodeLayer, callingCodeState);
}
