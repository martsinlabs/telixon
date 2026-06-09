import { NumberType, RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveMetadataTypes } from '../number-resolver/utils/resolve-metadata-types';

// True if the country supports at least one of the given number types. A FIXED_LINE_OR_MOBILE query
// matches a country with FIXED_LINE or MOBILE; UNKNOWN matches nothing. Empty `types` yields false.
// Requires ready resources.
export function countrySupportsNumberType(country: RegionId, types: readonly NumberType[]): boolean {
  if (types.length === 0) return false;

  const { refMapping, territorySpecTable } = getResourceProvider();
  const countryIndex: number | undefined = refMapping.regions.keyToIndex[country];
  if (countryIndex === undefined) return false;

  const territory = territorySpecTable[countryIndex];
  if (territory === undefined) return false;

  const supportedTypeIndices: Set<number> = new Set(territory.numberTypes.map((entry) => entry.type));
  const typeNames = refMapping.numberTypes;

  for (const type of types) {
    for (const metadataType of resolveMetadataTypes(type)) {
      const index: number = typeNames.indexOf(metadataType);
      if (index !== -1 && supportedTypeIndices.has(index)) return true;
    }
  }

  return false;
}
