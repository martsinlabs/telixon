import { MetadataNumberType, NumberType } from '@telixon/core/engine';

const NUMBER_TYPE_ALIASES: Partial<Record<NumberType, readonly MetadataNumberType[]>> = {
  FIXED_LINE_OR_MOBILE: ['FIXED_LINE', 'MOBILE'],
  UNKNOWN: [],
};

/** Maps a runtime `NumberType` to the metadata-side `MetadataNumberType[]` it covers, in lookup order. */
export function resolveMetadataTypes(type: NumberType): readonly MetadataNumberType[] {
  return NUMBER_TYPE_ALIASES[type] ?? [type as MetadataNumberType];
}
