import { getGeneralDescLengthMask, getRegionTypeCount, getRegionTypeLengthMask } from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { isNumberTypeAllowed } from './is-number-type-allowed';

// libphonenumber testNumberLength reads general-desc lengths; the per-type union applies only under a number-type filter (Telixon extension).
export function getAllowedLengthMask(
  countryIndex: number,
  countryFilter: BinaryFilter | null,
  numberTypeFilter: BinaryFilter | null,
): number {
  if (countryIndex < 0) return 0;
  if (countryFilter && countryFilter[countryIndex] === 0) return 0;

  const { engine } = getResourceProvider();

  if (!numberTypeFilter) return getGeneralDescLengthMask(engine, countryIndex);

  // Priority order keeps generalDesc last; the union covers concrete types only.
  const typeCount: number = getRegionTypeCount(engine, countryIndex);
  let unionMask = 0;
  for (let typePosition = 0; typePosition < typeCount - 1; typePosition++) {
    if (!isNumberTypeAllowed(numberTypeFilter, countryIndex, typePosition)) continue;
    unionMask |= getRegionTypeLengthMask(engine, countryIndex, typePosition);
  }

  return unionMask;
}
