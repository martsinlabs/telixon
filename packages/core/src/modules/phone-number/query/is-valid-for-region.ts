import { RegionCode } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResolvedPhoneNumber } from '../models';
import { numberTypeForRegion } from './number-type-for-region';

// libphonenumber isValidNumberForRegion: true when the number matches the given region's patterns.
export function isValidForRegion(resolved: ResolvedPhoneNumber, region: RegionCode): boolean {
  const regionIndex: number | undefined = getResourceProvider().regionKeyToIndex[region];
  if (regionIndex === undefined) return false;

  return numberTypeForRegion(resolved, regionIndex) !== null;
}
