import { CountryId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveRegionCode } from './resolve-region-code';

// The region a resolved number belongs to (getRegionCodeForNumber), falling back to the profile's own
// region while the number is incomplete and no specific pattern fully matches yet. Shared by getCountry
// and both controllers so they always report the same country. Takes the already-resolved country index
// to avoid recomputing it at the call site.
export function resolveRegionCodeOrFallback(
  callingCodeState: number,
  nationalDigits: string,
  fallbackCountryIndex: number,
): CountryId | null {
  return (
    resolveRegionCode(callingCodeState, nationalDigits) ??
    getResourceProvider().refMapping.countries.indexToKey[fallbackCountryIndex] ??
    null
  );
}
