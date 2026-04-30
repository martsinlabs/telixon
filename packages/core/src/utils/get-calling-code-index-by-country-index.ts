import { getResourceProvider } from '../resource-provider';
import { ResourceProvider } from '../resource-provider/models';

export function getCallingCodeIndexByCountryIndex(countryIndex: number): number {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const callingCode: number = +resourceProvider.territorySpecTable[countryIndex]!.countryCode;

  return resourceProvider.refMapping.callingCodes.keyToIndex[callingCode]!;
}
