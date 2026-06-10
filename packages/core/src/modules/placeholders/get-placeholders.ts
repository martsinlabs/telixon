import { NumberType, RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveMetadataTypes } from '../number-resolver/utils/resolve-metadata-types';
import { buildExamplePlaceholders, Placeholders } from './build-example-placeholders';

export type { Placeholders };

/** Returns example placeholder variants for `(region, type)`, or `null` if none. Requires ready resources. */
export function getPlaceholders(region: RegionId, type: NumberType): Placeholders | null {
  const { refMapping, territorySpecTable, formatsTable } = getResourceProvider();

  const regionIndex: number | undefined = refMapping.regions.keyToIndex[region];
  if (regionIndex === undefined) return null;

  const spec = territorySpecTable[regionIndex];
  if (!spec) return null;

  const callingCodeIndex: number | undefined = refMapping.callingCodes.keyToIndex[Number(spec.countryCode)];
  if (callingCodeIndex === undefined) return null;

  const formats = formatsTable[callingCodeIndex];
  if (!formats) return null;

  for (const metadataType of resolveMetadataTypes(type)) {
    const typeIndex: number = refMapping.numberTypes.indexOf(metadataType);
    if (typeIndex < 0) continue;

    for (const phoneNumberType of spec.numberTypes) {
      if (phoneNumberType.type !== typeIndex || phoneNumberType.exampleNumber === undefined) continue;

      const placeholders: Placeholders | null = buildExamplePlaceholders(
        phoneNumberType,
        spec,
        formats,
        refMapping,
        callingCodeIndex,
      );
      if (placeholders) return placeholders;
    }
  }

  return null;
}
