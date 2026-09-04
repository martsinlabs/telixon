import {
  containsLength,
  getExactTypeMask,
  getRegionPossibleLengthMask,
  getRegionTypeCount,
  getRegionTypeId,
  getRegionTypePossibleLengthMask,
} from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { isNumberTypeAllowed } from './is-number-type-allowed';

// general-desc pattern matches the whole number (libphonenumber maybeStripNationalPrefix viability test); pattern-only.
export function isGeneralDescExactMatch(endState: number, nationalLength: number, regionIndex: number): boolean {
  const { engine } = getResourceProvider();
  const generalDescPosition: number = getRegionTypeCount(engine, regionIndex) - 1;
  if (generalDescPosition < 0) return false;

  const exactMask: number = getExactTypeMask(engine, endState, regionIndex, nationalLength);
  return (exactMask & (1 << generalDescPosition)) !== 0;
}

// libphonenumber getNumberTypeHelper over exact acceptance: type-id bitset matching the whole number and its length, gated by general-desc. Zero = UNKNOWN.
export function resolveExactMatchedTypeIdMask(
  endState: number,
  nationalLength: number,
  regionIndex: number,
  numberTypeFilter: BinaryFilter | null,
): number {
  const { engine } = getResourceProvider();
  const typeCount: number = getRegionTypeCount(engine, regionIndex);
  if (typeCount === 0) return 0;

  const generalDescPosition: number = typeCount - 1;
  const exactMask: number = getExactTypeMask(engine, endState, regionIndex, nationalLength);
  if ((exactMask & (1 << generalDescPosition)) === 0) return 0;
  if (!containsLength(getRegionPossibleLengthMask(engine, regionIndex), nationalLength)) return 0;

  let matchedTypeIdMask = 0;
  let mask: number = exactMask & ~(1 << generalDescPosition);
  while (mask !== 0) {
    const typePosition: number = 31 - Math.clz32(mask & -mask);
    mask &= mask - 1;

    if (numberTypeFilter && !isNumberTypeAllowed(numberTypeFilter, regionIndex, typePosition)) continue;
    // A type without declared lengths inherits the region's general-desc lengths, as libphonenumber does.
    const typeLengthMask: number =
      getRegionTypePossibleLengthMask(engine, regionIndex, typePosition) ??
      getRegionPossibleLengthMask(engine, regionIndex);
    if (!containsLength(typeLengthMask, nationalLength)) continue;

    matchedTypeIdMask |= 1 << getRegionTypeId(engine, regionIndex, typePosition);
  }

  return matchedTypeIdMask;
}
