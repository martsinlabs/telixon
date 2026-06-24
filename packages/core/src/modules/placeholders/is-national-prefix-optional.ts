import {
  getMetadataFormatIndex,
  getMetadataTypeCount,
  getMetadataTypeExample,
  getMetadataTypeId,
  isFormatPrefixOptional,
  NumberType,
  RegionCode,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByRegionIndex } from '@telixon/core/utils/get-calling-code-index-by-region-index';
import { resolveMetadataTypes } from '../number-resolver/utils/resolve-metadata-types';
import { selectNationalFormatIndex } from '../number-resolver/utils/select-national-format';

/** True when the format matching the example number for `(region, type)` allows the national prefix to be omitted. */
export function isNationalPrefixOptional(region: RegionCode, type: NumberType): boolean {
  const resourceProvider = getResourceProvider();
  const tables = resourceProvider.engine;

  const regionIndex: number | undefined = resourceProvider.regionKeyToIndex[region];
  if (regionIndex === undefined) return false;

  const callingCodeIndex: number = getCallingCodeIndexByRegionIndex(regionIndex);
  if (callingCodeIndex === -1) return false;

  for (const metadataType of resolveMetadataTypes(type)) {
    const typeId: number = resourceProvider.numberTypeNames.indexOf(metadataType);
    if (typeId < 0) continue;

    const typeCount: number = getMetadataTypeCount(tables, regionIndex);
    for (let typePosition = 0; typePosition < typeCount; typePosition++) {
      if (getMetadataTypeId(tables, regionIndex, typePosition) !== typeId) continue;
      const exampleNsn: string | undefined = getMetadataTypeExample(tables, regionIndex, typePosition);
      if (exampleNsn === undefined) continue;

      const formatPosition: number = selectNationalFormatIndex(callingCodeIndex, exampleNsn, false);
      if (formatPosition < 0) continue;

      return isFormatPrefixOptional(tables, getMetadataFormatIndex(tables, callingCodeIndex, formatPosition));
    }
  }

  return false;
}
