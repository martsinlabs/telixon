import { getMetadataRegionCallingCode, RegionCode } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// The calling code for a region (Google libphonenumber getCountryCodeForRegion), e.g. 'US' -> '1'. Requires ready resources.
export function getCallingCodeForRegion(region: RegionCode): string {
  const resourceProvider = getResourceProvider();
  const regionIndex: number = resourceProvider.regionKeyToIndex[region]!;
  return String(getMetadataRegionCallingCode(resourceProvider.engine, regionIndex));
}
