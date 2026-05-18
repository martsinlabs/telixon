import { COUNTRY_IDS, type CountryId, type NumberType } from '@telixon/core';

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

export function isCountryId(value: string): value is CountryId {
  return COUNTRY_IDS.some((id) => id === value);
}

export function isNumberType(value: string): value is NumberType {
  return NUMBER_TYPES.some((t) => t === value);
}
