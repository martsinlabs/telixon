import { CountryId, MetadataNumberType, NumberType } from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';

const NUMBER_TYPE_ALIASES: Partial<Record<NumberType, readonly MetadataNumberType[]>> = {
  FIXED_LINE_OR_MOBILE: ['FIXED_LINE', 'MOBILE'],
  UNKNOWN: [],
};

function resolveMetadataTypes(type: NumberType): readonly string[] {
  return NUMBER_TYPE_ALIASES[type] ?? [type];
}

export function createCountryFilter(countryIds: CountryId[]): BinaryFilter {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const filter: BinaryFilter = new Uint8Array(resourceProvider.refMapping.countries.indexToKey.length);

  const keyToIndex: Record<CountryId, number> = resourceProvider.refMapping.countries.keyToIndex;

  for (const countryId of countryIds) {
    const idx: number | undefined = keyToIndex[countryId];

    if (idx !== undefined) {
      filter[idx] = 1;
    }
  }

  return filter;
}

export function createNumberTypeFilter(numberTypes: NumberType[]): BinaryFilter {
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

  // GENERAL_DESC must always pass — structural fallback for non-matching types.
  const generalDescIdx: number | undefined = keyToIndex['GENERAL_DESC'];
  if (generalDescIdx !== undefined) {
    filter[generalDescIdx] = 1;
  }

  return filter;
}
