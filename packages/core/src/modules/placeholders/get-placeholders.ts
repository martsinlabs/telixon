import { NumberType, PhoneNumberExamplePlaceholders, RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveMetadataTypes } from '../number-resolver/utils/resolve-metadata-types';

/** Per-region, per-type placeholder variants emitted by `@telixon/forge`. All fields optional. */
export type Placeholders = PhoneNumberExamplePlaceholders;

/** Returns placeholder variants for `(region, type)`, or `null` if unrecorded. Requires ready resources. */
export function getPlaceholders(region: RegionId, type: NumberType): Placeholders | null {
  const { refMapping, territorySpecTable } = getResourceProvider();

  const regionIndex: number | undefined = refMapping.regions.keyToIndex[region];
  if (regionIndex === undefined) return null;

  const spec = territorySpecTable[regionIndex];
  if (!spec) return null;

  for (const metadataType of resolveMetadataTypes(type)) {
    const typeIndex: number = refMapping.numberTypes.indexOf(metadataType);
    if (typeIndex < 0) continue;

    for (const phoneNumberType of spec.numberTypes) {
      if (phoneNumberType.type === typeIndex && phoneNumberType.placeholders) {
        return phoneNumberType.placeholders;
      }
    }
  }

  return null;
}
