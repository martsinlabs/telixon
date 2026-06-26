import type { RegionCode } from '@telixon/core';
import { getCallingCodeForRegion, REGION_CODES } from '@telixon/core';
import type { RegionDataFactory, RegionOption } from '../models';

export function computeBaseOptions<T = undefined>(
  locale: string,
  dataFactory?: RegionDataFactory<T>,
): RegionOption<T>[] {
  const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
  const baseSet: RegionOption<T>[] = new Array(REGION_CODES.length);

  for (let i = 0; i < REGION_CODES.length; i++) {
    const region: RegionCode = REGION_CODES[i]!;
    const callingCode: string = getCallingCodeForRegion(region);
    const displayName: string = displayNames.of(region) ?? region;
    // Safe: T defaults to `undefined` whenever dataFactory is omitted.
    const data: T = dataFactory ? dataFactory({ region, callingCode, displayName, locale }) : (undefined as T);

    baseSet[i] = { region, callingCode, displayName, data };
  }

  return baseSet;
}
