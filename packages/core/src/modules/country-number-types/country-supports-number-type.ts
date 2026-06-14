import { getRegionTypeCount, getRegionTypeId, NumberType, RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveMetadataTypes } from '../number-resolver/utils/resolve-metadata-types';

// True if the country supports at least one of the given types (FIXED_LINE_OR_MOBILE matches FIXED_LINE or MOBILE; UNKNOWN/empty matches nothing). Requires ready resources.
export function countrySupportsNumberType(country: RegionId, types: readonly NumberType[]): boolean {
  if (types.length === 0) return false;

  const resourceProvider = getResourceProvider();
  const countryIndex: number | undefined = resourceProvider.regionKeyToIndex[country];
  if (countryIndex === undefined) return false;

  const typeCount: number = getRegionTypeCount(resourceProvider.engine, countryIndex);
  const supportedTypeIds: Set<number> = new Set();
  for (let typePosition = 0; typePosition < typeCount; typePosition++) {
    supportedTypeIds.add(getRegionTypeId(resourceProvider.engine, countryIndex, typePosition));
  }

  for (const type of types) {
    for (const metadataType of resolveMetadataTypes(type)) {
      const typeId: number = resourceProvider.numberTypeNames.indexOf(metadataType);
      if (typeId !== -1 && supportedTypeIds.has(typeId)) return true;
    }
  }

  return false;
}
