import { getResourceProvider } from '../resource-provider';

export function getCallingCodeIndexByCountryIndex(countryIndex: number): number {
  return getResourceProvider().callingCodeIndexByCountry[countryIndex] ?? -1;
}
