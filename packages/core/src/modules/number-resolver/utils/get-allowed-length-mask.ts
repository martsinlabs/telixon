import { getRegionPossibleLengthMask, getRegionTypeCount, getRegionTypePossibleLengthMask } from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { isNumberTypeAllowed } from './is-number-type-allowed';

// libphonenumber testNumberLength reads general-desc lengths; the per-type union applies only under a number-type filter (Telixon extension).
export function getAllowedLengthMask(
  regionIndex: number,
  regionFilter: BinaryFilter | null,
  numberTypeFilter: BinaryFilter | null,
): number {
  if (regionIndex < 0) return 0;
  if (regionFilter && regionFilter[regionIndex] === 0) return 0;

  const { engine } = getResourceProvider();

  if (!numberTypeFilter) return getRegionPossibleLengthMask(engine, regionIndex);

  // Priority order keeps generalDesc last; the union covers concrete types only.
  const typeCount: number = getRegionTypeCount(engine, regionIndex);
  let unionMask = 0;
  for (let typePosition = 0; typePosition < typeCount - 1; typePosition++) {
    if (!isNumberTypeAllowed(numberTypeFilter, regionIndex, typePosition)) continue;
    // A type without declared lengths inherits the region's general-desc lengths, as libphonenumber does.
    unionMask |=
      getRegionTypePossibleLengthMask(engine, regionIndex, typePosition) ??
      getRegionPossibleLengthMask(engine, regionIndex);
  }

  return unionMask;
}
