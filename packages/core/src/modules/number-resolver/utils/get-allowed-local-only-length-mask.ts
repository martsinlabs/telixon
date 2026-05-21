import { MetadataNumberType } from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';

const GENERAL_DESC: MetadataNumberType = 'GENERAL_DESC';

// Union of local-only lengths across the country's allowed concrete number types.
export function getAllowedLocalOnlyLengthMask(
  countryIndex: number,
  countryFilter: BinaryFilter | null,
  numberTypeFilter: BinaryFilter | null,
): number {
  if (countryIndex < 0) return 0;
  if (countryFilter && countryFilter[countryIndex] === 0) return 0;

  const resourceProvider = getResourceProvider();
  const territorySpec = resourceProvider.territorySpecTable[countryIndex];
  if (!territorySpec) return 0;

  let unionMask = 0;

  for (const numberType of territorySpec.numberTypes) {
    if (resourceProvider.refMapping.numberTypes[numberType.type] === GENERAL_DESC) continue;
    if (numberTypeFilter && numberTypeFilter[numberType.type] === 0) continue;

    unionMask |= numberType.possibleLengths?.localOnly ?? 0;
  }

  return unionMask;
}
