import { NumberType, RegionId } from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { resolveMetadataTypes } from './resolve-metadata-types';

export function createCountryFilter(countryIds: readonly RegionId[]): BinaryFilter {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const filter: BinaryFilter = new Uint8Array(resourceProvider.refMapping.regions.indexToKey.length);

  const keyToIndex: Record<RegionId, number> = resourceProvider.refMapping.regions.keyToIndex;

  for (const countryId of countryIds) {
    const idx: number | undefined = keyToIndex[countryId];

    if (idx !== undefined) {
      filter[idx] = 1;
    }
  }

  return filter;
}

export function createNumberTypeFilter(numberTypes: readonly NumberType[]): BinaryFilter {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const filter: BinaryFilter = new Uint8Array(resourceProvider.refMapping.numberTypes.length);

  const keyToIndex: Record<string, number> = {};

  resourceProvider.refMapping.numberTypes.forEach((key: string, index: number) => {
    keyToIndex[key] = index;
  });

  for (const type of numberTypes) {
    for (const metadataType of resolveMetadataTypes(type)) {
      const idx: number | undefined = keyToIndex[metadataType];

      if (idx !== undefined) {
        filter[idx] = 1;
      }
    }
  }

  // GENERAL_DESC must always pass: structural fallback for non-matching types.
  const generalDescIdx: number | undefined = keyToIndex['GENERAL_DESC'];
  if (generalDescIdx !== undefined) {
    filter[generalDescIdx] = 1;
  }

  return filter;
}
