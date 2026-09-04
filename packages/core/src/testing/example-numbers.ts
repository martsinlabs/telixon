import type { MetadataNumberType, RegionCode } from '@telixon/core/engine';
import { getRegionTypeCount, getRegionTypeExample, getRegionTypeId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

/** Returns the engine-emitted example number for `(region, type)`. Throws when the tuple is unknown. */
export function getExampleNumber(region: RegionCode, type: MetadataNumberType): string {
  const provider = getResourceProvider();

  const regionIndex: number | undefined = provider.regionKeyToIndex[region];
  if (regionIndex === undefined) {
    throw new Error(`getExampleNumber: unknown region "${region}"`);
  }

  const typeId: number = provider.numberTypeNames.indexOf(type);
  if (typeId === -1) {
    throw new Error(`getExampleNumber: unknown number type "${type}"`);
  }

  const typeCount: number = getRegionTypeCount(provider.engine, regionIndex);
  for (let typePosition = 0; typePosition < typeCount; typePosition++) {
    if (getRegionTypeId(provider.engine, regionIndex, typePosition) !== typeId) continue;
    const example: string | undefined = getRegionTypeExample(provider.engine, regionIndex, typePosition);
    if (example !== undefined) return example;
  }

  throw new Error(`getExampleNumber: no example number for region="${region}" type="${type}"`);
}
