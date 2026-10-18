import { NUMBER_TYPES, type NumberType } from '@telixon/core';

const KNOWN_NUMBER_TYPES: ReadonlySet<string> = new Set(NUMBER_TYPES);

/** Whether `value` names a number type. */
export function isNumberType(value: string): value is NumberType {
  return KNOWN_NUMBER_TYPES.has(value);
}
