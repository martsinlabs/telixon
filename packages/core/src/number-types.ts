import { NumberType } from '@telixon/core/engine';

/** Every {@link NumberType} value, in a stable order. */
export const NUMBER_TYPES = Object.freeze([
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
] as const satisfies readonly NumberType[]);

// Fails to compile if NumberType gains a value missing from NUMBER_TYPES, keeping the list exhaustive.
const _everyNumberTypeListed: Exclude<NumberType, (typeof NUMBER_TYPES)[number]> extends never ? true : never = true;
