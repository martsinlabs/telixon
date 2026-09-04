import {
  getFormatCount,
  getFormatIndex,
  getFormatIntlTemplate,
  getRegionTypeCount,
  getRegionTypeExample,
  getRegionTypeId,
  NumberType,
  RegionCode,
  selectCompleteFormat,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByRegionIndex } from '@telixon/core/utils/get-calling-code-index-by-region-index';
import { resolveMetadataTypes } from '../number-resolver/utils/resolve-metadata-types';
import { buildExamplePlaceholders, Placeholders } from './build-example-placeholders';

export type { Placeholders };

// True when any of the calling code's formats can render internationally ('NA' marks an explicit absence).
function hasInternationalFormat(callingCodeIndex: number): boolean {
  const tables = getResourceProvider().engine;
  const formatCount: number = getFormatCount(tables, callingCodeIndex);
  for (let formatPosition = 0; formatPosition < formatCount; formatPosition++) {
    const formatIndex: number = getFormatIndex(tables, callingCodeIndex, formatPosition);
    if (getFormatIntlTemplate(tables, formatIndex) !== 'NA') return true;
  }
  return false;
}

/** Example placeholder variants for `(region, type)`, or `null` when none exists. */
export function getPlaceholders(region: RegionCode, type: NumberType): Placeholders | null {
  const resourceProvider = getResourceProvider();
  const tables = resourceProvider.engine;

  const regionIndex: number | undefined = resourceProvider.regionKeyToIndex[region];
  if (regionIndex === undefined) return null;

  const callingCodeIndex: number = getCallingCodeIndexByRegionIndex(regionIndex);
  if (callingCodeIndex === -1) return null;

  for (const metadataType of resolveMetadataTypes(type)) {
    const typeId: number = resourceProvider.numberTypeNames.indexOf(metadataType);
    if (typeId < 0) continue;

    const typeCount: number = getRegionTypeCount(tables, regionIndex);
    for (let typePosition = 0; typePosition < typeCount; typePosition++) {
      if (getRegionTypeId(tables, regionIndex, typePosition) !== typeId) continue;
      const exampleNsn: string | undefined = getRegionTypeExample(tables, regionIndex, typePosition);
      if (exampleNsn === undefined) continue;

      const selected = selectCompleteFormat(resourceProvider.engine, callingCodeIndex, exampleNsn);
      const nationalFormatIndex: number =
        selected.national === -1 ? -1 : getFormatIndex(tables, callingCodeIndex, selected.national);
      const internationalPosition: number = hasInternationalFormat(callingCodeIndex)
        ? selected.international
        : selected.national;
      const internationalFormatIndex: number =
        internationalPosition === -1 ? -1 : getFormatIndex(tables, callingCodeIndex, internationalPosition);

      const placeholders: Placeholders | null = buildExamplePlaceholders(
        exampleNsn,
        regionIndex,
        nationalFormatIndex,
        internationalFormatIndex,
      );
      if (placeholders) return placeholders;
    }
  }

  return null;
}
