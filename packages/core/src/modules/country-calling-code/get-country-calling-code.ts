import { CountryId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// The country calling code for a region (libphonenumber getCountryCodeForRegion), e.g. 'US' -> '1',
// 'GB' -> '44'. Total over CountryId — every region has a calling code. Requires ready resources.
export function getCountryCallingCode(region: CountryId): string {
  const { refMapping, territorySpecTable } = getResourceProvider();
  return territorySpecTable[refMapping.countries.keyToIndex[region]]!.countryCode;
}
