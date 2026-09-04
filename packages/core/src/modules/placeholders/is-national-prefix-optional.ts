import {
  getFormatIndex,
  getRegionTypeCount,
  getRegionTypeExample,
  getRegionTypeId,
  isFormatPrefixOptional,
  NumberType,
  RegionCode,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByRegionIndex } from '@telixon/core/utils/get-calling-code-index-by-region-index';
import { resolveMetadataTypes } from '../number-resolver/utils/resolve-metadata-types';
import { selectNationalFormatIndex } from '../number-resolver/utils/select-national-format';

/** Whether a `(region, type)` number can be written without its national (trunk) prefix. */
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

    const typeCount: number = getRegionTypeCount(tables, regionIndex);
    for (let typePosition = 0; typePosition < typeCount; typePosition++) {
      if (getRegionTypeId(tables, regionIndex, typePosition) !== typeId) continue;
      const exampleNsn: string | undefined = getRegionTypeExample(tables, regionIndex, typePosition);
      if (exampleNsn === undefined) continue;

      const formatPosition: number = selectNationalFormatIndex(callingCodeIndex, exampleNsn, false);
      if (formatPosition < 0) continue;

      return isFormatPrefixOptional(tables, getFormatIndex(tables, callingCodeIndex, formatPosition));
    }
  }

  return false;
}
