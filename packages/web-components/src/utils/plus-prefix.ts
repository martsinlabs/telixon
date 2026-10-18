import type { PlusPrefixMode } from '@telixon/core';

/** Whether `value` names a plus prefix mode. */
export function isPlusPrefixMode(value: string): value is PlusPrefixMode {
  return value === 'none' || value === 'fixed' || value === 'erasable';
}
