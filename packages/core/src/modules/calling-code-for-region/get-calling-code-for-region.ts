import { getMetadataRegionCallingCode, RegionCode } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// The calling code for a region (Google libphonenumber getCountryCodeForRegion), e.g. 'US' -> '1'; '0' for an unknown region. Requires ready resources.
export function getCallingCodeForRegion(region: RegionCode): string {
  const resourceProvider = getResourceProvider();
  const regionIndex: number | undefined = resourceProvider.regionKeyToIndex[region];
  if (regionIndex === undefined) return '0';
  return String(getMetadataRegionCallingCode(resourceProvider.engine, regionIndex));
}
