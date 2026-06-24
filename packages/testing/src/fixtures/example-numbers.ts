import type { MetadataNumberType, RegionCode } from '@telixon/core/engine';
import { getMetadataTypeCount, getMetadataTypeExample, getMetadataTypeId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

/** Returns the engine-emitted example number for `(region, type)`. Throws when the tuple is unknown. */
export function getExampleNumber(region: RegionCode, type: MetadataNumberType): string {
  const provider = getResourceProvider();

  const countryIndex: number | undefined = provider.regionKeyToIndex[region];
  if (countryIndex === undefined) {
    throw new Error(`getExampleNumber: unknown region "${region}"`);
  }

  const typeId: number = provider.numberTypeNames.indexOf(type);
  if (typeId === -1) {
    throw new Error(`getExampleNumber: unknown number type "${type}"`);
  }

  const typeCount: number = getMetadataTypeCount(provider.engine, countryIndex);
  for (let typePosition = 0; typePosition < typeCount; typePosition++) {
    if (getMetadataTypeId(provider.engine, countryIndex, typePosition) !== typeId) continue;
    const example: string | undefined = getMetadataTypeExample(provider.engine, countryIndex, typePosition);
    if (example !== undefined) return example;
  }

  throw new Error(`getExampleNumber: no example number for region="${region}" type="${type}"`);
}
