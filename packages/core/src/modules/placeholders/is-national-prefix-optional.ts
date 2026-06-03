import { NumberType, RegionId, TerritorySpec } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveMetadataTypes } from '../number-resolver/utils/resolve-metadata-types';
import { selectNationalFormatIndex } from '../number-resolver/utils/select-national-format';

/** True when the format matching the example number for `(region, type)` allows the national prefix to be omitted. */
export function isNationalPrefixOptional(region: RegionId, type: NumberType): boolean {
  const { refMapping, territorySpecTable, formatsTable } = getResourceProvider();

  const regionIndex: number | undefined = refMapping.regions.keyToIndex[region];
  if (regionIndex === undefined) return false;

  const spec: TerritorySpec | undefined = territorySpecTable[regionIndex];
  if (!spec) return false;

  const callingCodeIndex: number | undefined = refMapping.callingCodes.keyToIndex[Number(spec.countryCode)];
  if (callingCodeIndex === undefined) return false;

  for (const metadataType of resolveMetadataTypes(type)) {
    const typeIndex: number = refMapping.numberTypes.indexOf(metadataType);
    if (typeIndex < 0) continue;

    for (const phoneNumberType of spec.numberTypes) {
      if (phoneNumberType.type !== typeIndex) continue;
      const exampleNumber = phoneNumberType.exampleNumber;
      if (typeof exampleNumber !== 'string') continue;

      const formatIndex: number = selectNationalFormatIndex(callingCodeIndex, exampleNumber);
      if (formatIndex < 0) continue;

      return formatsTable[callingCodeIndex]![formatIndex]!.nationalPrefixOptionalWhenFormatting === 'true';
    }
  }

  return false;
}
