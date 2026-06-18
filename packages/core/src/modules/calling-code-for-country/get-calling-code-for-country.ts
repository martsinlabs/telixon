import { getMetadataRegionCallingCode, RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// The calling code for a country (Google libphonenumber getCountryCodeForRegion), e.g. 'US' -> '1'. Requires ready resources.
export function getCallingCodeForCountry(country: RegionId): string {
  const resourceProvider = getResourceProvider();
  const countryIndex: number = resourceProvider.regionKeyToIndex[country]!;
  return String(getMetadataRegionCallingCode(resourceProvider.engine, countryIndex));
}
