import { REGION_CODES, RegionCode } from '@telixon/core';
import { Oracle } from '../oracle';

// The geographic domain every sweep covers: oracle-supported regions and their distinct calling codes
// (codes '0'/'' excluded). Shared so the fuzz, case coverage, and controller checks span the same space.
export interface EnumerationDomain {
  readonly regions: readonly RegionCode[];
  readonly callingCodes: readonly string[];
}

export function geographicDomain(oracle: Oracle): EnumerationDomain {
  const supported = new Set<string>(oracle.supportedRegions());
  const regions: readonly RegionCode[] = REGION_CODES.filter((region) => supported.has(region));
  const callingCodes: readonly string[] = [
    ...new Set(regions.map((region) => oracle.countryCallingCode(region))),
  ].filter((code) => code !== '0' && code !== '');
  return { regions, callingCodes };
}
