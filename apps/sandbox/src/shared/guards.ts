import { REGION_CODES, type NumberType, type RegionCode } from '@telixon/core';

const NUMBER_TYPES = [
  'FIXED_LINE',
  'MOBILE',
  'FIXED_LINE_OR_MOBILE',
  'TOLL_FREE',
  'PREMIUM_RATE',
  'SHARED_COST',
  'VOIP',
  'PERSONAL_NUMBER',
  'PAGER',
  'UAN',
  'VOICEMAIL',
  'UNKNOWN',
] as const satisfies readonly NumberType[];

export function isRegionId(value: string): value is RegionCode {
  return REGION_CODES.some((id: unknown) => id === value);
}

export function isNumberType(value: string): value is NumberType {
  return NUMBER_TYPES.some((type: unknown) => type === value);
}
