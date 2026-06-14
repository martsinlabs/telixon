import { NumberType, RegionId } from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { resolveMetadataTypes } from './resolve-metadata-types';

export function createCountryFilter(countryIds: readonly RegionId[]): BinaryFilter {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const filter: BinaryFilter = new Uint8Array(resourceProvider.regionIds.length);

  for (const countryId of countryIds) {
    const countryIndex: number | undefined = resourceProvider.regionKeyToIndex[countryId];

    if (countryIndex !== undefined) {
      filter[countryIndex] = 1;
    }
  }

  return filter;
}

export function createNumberTypeFilter(numberTypes: readonly NumberType[]): BinaryFilter {
  const resourceProvider: ResourceProvider = getResourceProvider();
  const typeNames: readonly string[] = resourceProvider.numberTypeNames;

  const filter: BinaryFilter = new Uint8Array(typeNames.length);

  for (const type of numberTypes) {
    for (const metadataType of resolveMetadataTypes(type)) {
      const typeId: number = typeNames.indexOf(metadataType);

      if (typeId !== -1) {
        filter[typeId] = 1;
      }
    }
  }

  // GENERAL_DESC must always pass: structural fallback for non-matching types.
  const generalDescTypeId: number = typeNames.indexOf('GENERAL_DESC');
  if (generalDescTypeId !== -1) {
    filter[generalDescTypeId] = 1;
  }

  return filter;
}
