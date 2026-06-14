import { getMetadataRegionCallingCode, RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// The calling code for a region (libphonenumber getCountryCodeForRegion), e.g. 'US' -> '1'. Requires ready resources.
export function getCallingCodeForRegion(region: RegionId): string {
  const resourceProvider = getResourceProvider();
  const countryIndex: number = resourceProvider.regionKeyToIndex[region]!;
  return String(getMetadataRegionCallingCode(resourceProvider.engine, countryIndex));
}
