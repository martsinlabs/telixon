import type { MetadataNumberType, RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

/** Returns the engine-emitted example number for `(region, type)`. Throws when the tuple is unknown. */
export function getExampleNumber(region: RegionId, type: MetadataNumberType): string {
  const provider = getResourceProvider();

  const countryIndex: number | undefined = provider.refMapping.regions.keyToIndex[region];
  if (countryIndex === undefined) {
    throw new Error(`getExampleNumber: unknown region "${region}"`);
  }

  const territory = provider.territorySpecTable[countryIndex];
  if (territory === undefined) {
    throw new Error(`getExampleNumber: no territory spec for region "${region}"`);
  }

  const typeIndex: number = provider.refMapping.numberTypes.indexOf(type);
  if (typeIndex === -1) {
    throw new Error(`getExampleNumber: unknown number type "${type}"`);
  }

  const phoneType = territory.numberTypes.find((entry) => entry.type === typeIndex);
  if (phoneType?.exampleNumber === undefined) {
    throw new Error(`getExampleNumber: no example number for region="${region}" type="${type}"`);
  }

  return String(phoneType.exampleNumber);
}
