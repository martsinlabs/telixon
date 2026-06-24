import { getRegionTypeCount, getRegionTypeId, NumberType, RegionCode } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveMetadataTypes } from '../number-resolver/utils/resolve-metadata-types';

// True if the region supports at least one of the given types (FIXED_LINE_OR_MOBILE matches FIXED_LINE or MOBILE; UNKNOWN/empty matches nothing). Requires ready resources.
export function regionSupportsNumberTypes(region: RegionCode, types: readonly NumberType[]): boolean {
  if (types.length === 0) return false;

  const resourceProvider = getResourceProvider();
  const regionIndex: number | undefined = resourceProvider.regionKeyToIndex[region];
  if (regionIndex === undefined) return false;

  const typeCount: number = getRegionTypeCount(resourceProvider.engine, regionIndex);
  const supportedTypeIds: Set<number> = new Set();
  for (let typePosition = 0; typePosition < typeCount; typePosition++) {
    supportedTypeIds.add(getRegionTypeId(resourceProvider.engine, regionIndex, typePosition));
  }

  for (const type of types) {
    for (const metadataType of resolveMetadataTypes(type)) {
      const typeId: number = resourceProvider.numberTypeNames.indexOf(metadataType);
      if (typeId !== -1 && supportedTypeIds.has(typeId)) return true;
    }
  }

  return false;
}
