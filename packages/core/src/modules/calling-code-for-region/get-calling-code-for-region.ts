import { getMetadataRegionCallingCode, RegionCode } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

/**
 * The country calling code for `region`, without the `+`, or `'0'` for a region the engine does not
 * know. Mirrors libphonenumber's getCountryCodeForRegion.
 *
 * @example getCallingCodeForRegion('US'); // '1'
 */
export function getCallingCodeForRegion(region: RegionCode): string {
  const resourceProvider = getResourceProvider();
  const regionIndex: number | undefined = resourceProvider.regionKeyToIndex[region];
  if (regionIndex === undefined) return '0';
  return String(getMetadataRegionCallingCode(resourceProvider.engine, regionIndex));
}
