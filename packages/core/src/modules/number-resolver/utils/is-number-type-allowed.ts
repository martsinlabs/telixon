import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';

export function isNumberTypeAllowed(filter: BinaryFilter, countryIndex: number, numberTypeIndex: number): boolean {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const typeId: number = resourceProvider.territorySpecTable[countryIndex]!.numberTypes[numberTypeIndex]!.type;

  return filter[typeId] === 1;
}
