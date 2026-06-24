import { getCallingCodeForRegion, REGION_CODES, RegionCode } from '@telixon/core';
import type { CountryDataFactory, CountryOption } from '../models';

export function computeBaseOptions<T>(locale: string, dataFactory?: CountryDataFactory<T>): CountryOption<T>[] {
  const displayNames = new Intl.DisplayNames([locale], { type: 'region' });
  const baseSet: CountryOption<T>[] = new Array(REGION_CODES.length);

  for (let i = 0; i < REGION_CODES.length; i++) {
    const country: RegionCode = REGION_CODES[i]!;
    const callingCode: string = getCallingCodeForRegion(country);
    const displayName: string = displayNames.of(country) ?? country;
    // Safe: T defaults to `undefined` whenever dataFactory is omitted.
    const data: T = dataFactory ? dataFactory({ country, callingCode, displayName, locale }) : (undefined as T);

    baseSet[i] = { country, callingCode, displayName, data };
  }

  return baseSet;
}
