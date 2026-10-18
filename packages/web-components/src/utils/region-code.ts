import { REGION_CODES, type RegionCode } from '@telixon/core';

const KNOWN_REGION_CODES: ReadonlySet<string> = new Set(REGION_CODES);

/** Whether `value` is a region code the engine knows. */
export function isRegionCode(value: string): value is RegionCode {
  return KNOWN_REGION_CODES.has(value);
}
