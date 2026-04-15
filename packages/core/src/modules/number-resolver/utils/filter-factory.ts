import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';

export function createCountryFilter(countryIds: string[]): BinaryFilter {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const filter: BinaryFilter = new Uint8Array(resourceProvider.refMapping.countries.indexToKey.length);

  const keyToIndex: Record<string, number> = resourceProvider.refMapping.countries.keyToIndex;

  for (const countryId of countryIds) {
    const idx: number | undefined = keyToIndex[countryId];

    if (idx !== undefined) {
      filter[idx] = 1;
    }
  }

  return filter;
}

export function createNumberTypeFilter(numberTypes: string[]): BinaryFilter {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const filter: BinaryFilter = new Uint8Array(resourceProvider.refMapping.numberTypes.length);

  const keyToIndex: Record<string, number> = {};

  resourceProvider.refMapping.numberTypes.forEach((key: string, index: number) => {
    keyToIndex[key] = index;
  });

  for (const type of numberTypes) {
    const idx: number | undefined = keyToIndex[type];

    if (idx !== undefined) {
      filter[idx] = 1;
    }
  }

  return filter;
}
