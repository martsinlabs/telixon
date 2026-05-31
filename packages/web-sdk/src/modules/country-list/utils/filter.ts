import type { MetadataNumberType, NumberType, RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

const NUMBER_TYPE_ALIASES: Partial<Record<NumberType, readonly MetadataNumberType[]>> = {
  FIXED_LINE_OR_MOBILE: ['FIXED_LINE', 'MOBILE'],
  UNKNOWN: [],
};

function resolveMetadataTypes(type: NumberType): readonly MetadataNumberType[] {
  return NUMBER_TYPE_ALIASES[type] ?? [type as MetadataNumberType];
}

export function regionSupportsAnyNumberType(region: RegionId, types: readonly NumberType[]): boolean {
  if (types.length === 0) return false;

  const provider = getResourceProvider();
  const countryIndex: number | undefined = provider.refMapping.regions.keyToIndex[region];
  if (countryIndex === undefined) return false;

  const territory = provider.territorySpecTable[countryIndex];
  if (territory === undefined) return false;

  const typeNames = provider.refMapping.numberTypes;
  const supportedTypeIndices: Set<number> = new Set(territory.numberTypes.map((t) => t.type));

  for (const type of types) {
    for (const metadataType of resolveMetadataTypes(type)) {
      const idx: number = typeNames.indexOf(metadataType);
      if (idx !== -1 && supportedTypeIndices.has(idx)) return true;
    }
  }

  return false;
}
