import { RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// The country calling code for a region (libphonenumber getCountryCodeForRegion), e.g. 'US' -> '1',
// 'GB' -> '44'. Total over RegionId — every region has a calling code. Requires ready resources.
export function getCountryCallingCode(region: RegionId): string {
  const { refMapping, territorySpecTable } = getResourceProvider();
  return territorySpecTable[refMapping.regions.keyToIndex[region]]!.countryCode;
}
