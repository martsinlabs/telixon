import { getRegionTypeId } from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';

export function isNumberTypeAllowed(filter: BinaryFilter, countryIndex: number, numberTypeIndex: number): boolean {
  const typeId: number = getRegionTypeId(getResourceProvider().engine, countryIndex, numberTypeIndex);
  return filter[typeId] === 1;
}
