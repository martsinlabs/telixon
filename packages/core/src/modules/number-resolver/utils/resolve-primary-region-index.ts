import { getCallingCodePrimaryRegion } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// Calling code's main region (libphonenumber checks possible lengths against it); the default region for national-only input.
export function resolvePrimaryRegionIndex(callingCodeState: number, defaultRegionIndex: number): number {
  if (callingCodeState === -1) return defaultRegionIndex;
  return getCallingCodePrimaryRegion(getResourceProvider().engine, callingCodeState);
}
