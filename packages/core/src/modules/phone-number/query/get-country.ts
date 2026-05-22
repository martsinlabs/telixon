import { RegionId, getRegionIndex } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveRegionCodeOrFallback } from '../../number-resolver/utils/resolve-region-code-or-fallback';
import { ResolvedPhoneNumber } from '../models';

// Region the number belongs to (libphonenumber getRegionCodeForNumber). Uses the same resolver as the
// input controller's country, so getCountry and controller.country always agree. null until resolved.
export function getCountry(resolved: ResolvedPhoneNumber): RegionId | null {
  const { profileRef, callingCodeState, nationalDigits } = resolved;
  if (!profileRef) return null;

  const countryIndex: number = getRegionIndex(getResourceProvider().countryScopeLayer, profileRef.stateCountryIndex);
  return resolveRegionCodeOrFallback(callingCodeState, nationalDigits, countryIndex);
}
