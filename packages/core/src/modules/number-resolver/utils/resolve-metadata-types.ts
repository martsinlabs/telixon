import { MetadataNumberType, NumberType } from '@telixon/core/engine';

const NUMBER_TYPE_TO_METADATA: Record<NumberType, readonly MetadataNumberType[]> = {
  FIXED_LINE: ['FIXED_LINE'],
  MOBILE: ['MOBILE'],
  FIXED_LINE_OR_MOBILE: ['FIXED_LINE', 'MOBILE'],
  TOLL_FREE: ['TOLL_FREE'],
  PREMIUM_RATE: ['PREMIUM_RATE'],
  SHARED_COST: ['SHARED_COST'],
  VOIP: ['VOIP'],
  PERSONAL_NUMBER: ['PERSONAL_NUMBER'],
  PAGER: ['PAGER'],
  UAN: ['UAN'],
  VOICEMAIL: ['VOICEMAIL'],
  UNKNOWN: [],
};

/**
 * Maps a runtime `NumberType` to the metadata-side `MetadataNumberType[]` it covers, in lookup
 * order. Unchecked input from JavaScript callers maps to an empty list and is skipped.
 */
export function resolveMetadataTypes(type: NumberType): readonly MetadataNumberType[] {
  return NUMBER_TYPE_TO_METADATA[type] ?? [];
}
