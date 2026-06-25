import { NUMBER_TYPES, REGION_CODES, type NumberType, type RegionCode } from '@telixon/core';

export function isRegionId(value: string): value is RegionCode {
  return REGION_CODES.some((id: unknown) => id === value);
}

export function isNumberType(value: string): value is NumberType {
  return NUMBER_TYPES.some((type: unknown) => type === value);
}
