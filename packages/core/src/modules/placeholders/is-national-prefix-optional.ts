import {
  getMetadataFormatIndex,
  getMetadataTypeCount,
  getMetadataTypeExample,
  getMetadataTypeId,
  isFormatPrefixOptional,
  NumberType,
  RegionId,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { resolveMetadataTypes } from '../number-resolver/utils/resolve-metadata-types';
import { selectNationalFormatIndex } from '../number-resolver/utils/select-national-format';

/** True when the format matching the example number for `(region, type)` allows the national prefix to be omitted. */
export function isNationalPrefixOptional(region: RegionId, type: NumberType): boolean {
  const resourceProvider = getResourceProvider();
  const tables = resourceProvider.engine;

  const countryIndex: number | undefined = resourceProvider.regionKeyToIndex[region];
  if (countryIndex === undefined) return false;

  const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(countryIndex);
  if (callingCodeIndex === -1) return false;

  for (const metadataType of resolveMetadataTypes(type)) {
    const typeId: number = resourceProvider.numberTypeNames.indexOf(metadataType);
    if (typeId < 0) continue;

    const typeCount: number = getMetadataTypeCount(tables, countryIndex);
    for (let typePosition = 0; typePosition < typeCount; typePosition++) {
      if (getMetadataTypeId(tables, countryIndex, typePosition) !== typeId) continue;
      const exampleNsn: string | undefined = getMetadataTypeExample(tables, countryIndex, typePosition);
      if (exampleNsn === undefined) continue;

      const formatPosition: number = selectNationalFormatIndex(callingCodeIndex, exampleNsn, false);
      if (formatPosition < 0) continue;

      return isFormatPrefixOptional(tables, getMetadataFormatIndex(tables, callingCodeIndex, formatPosition));
    }
  }

  return false;
}
