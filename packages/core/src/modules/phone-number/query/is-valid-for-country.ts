import { RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResolvedPhoneNumber } from '../models';
import { numberTypeForRegion } from './number-type-for-region';

// libphonenumber isValidNumberForRegion: true when the number matches the given country's patterns.
export function isValidForCountry(resolved: ResolvedPhoneNumber, country: RegionId): boolean {
  const regionIndex: number | undefined = getResourceProvider().regionKeyToIndex[country];
  if (regionIndex === undefined) return false;

  return numberTypeForRegion(resolved, regionIndex) !== null;
}
