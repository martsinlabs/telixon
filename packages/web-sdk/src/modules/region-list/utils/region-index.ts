import type { RegionCode } from '@telixon/core';
import { REGION_CODES } from '@telixon/core';

// REGION_CODES lists regions by engine index, which is also their position in the base set.
const REGION_INDEX_BY_CODE: ReadonlyMap<RegionCode, number> = new Map(
  REGION_CODES.map((region, index): [RegionCode, number] => [region, index]),
);

export function getRegionIndex(region: RegionCode): number | undefined {
  return REGION_INDEX_BY_CODE.get(region);
}
