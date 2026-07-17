import { getCallingCodeStateRegions } from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getAllowedLengthMask } from './get-allowed-length-mask';
import { getAllowedLocalOnlyLengthMask } from './get-allowed-local-only-length-mask';
import { resolvePrimaryRegionIndex } from './resolve-primary-region-index';

/** Length masks backing the possibility checks; `national` and `localOnly` mirror libphonenumber's split. */
export interface PossibilityLengthMasks {
  readonly national: number;
  readonly localOnly: number;
}

// Unfiltered, the masks read the calling code's main region (libphonenumber testNumberLength); a
// region filter unions the allowed regions instead, so a number valid for an allowed region is always possible.
export function resolvePossibilityLengthMasks(
  callingCodeState: number,
  defaultRegionIndex: number,
  regionFilter: BinaryFilter | null,
  numberTypeFilter: BinaryFilter | null,
): PossibilityLengthMasks {
  if (regionFilter === null || callingCodeState === -1) {
    const regionIndex: number = resolvePrimaryRegionIndex(callingCodeState, defaultRegionIndex);
    return {
      national: getAllowedLengthMask(regionIndex, regionFilter, numberTypeFilter),
      localOnly: getAllowedLocalOnlyLengthMask(regionIndex, regionFilter, numberTypeFilter),
    };
  }

  const regions: Uint8Array = getCallingCodeStateRegions(getResourceProvider().engine, callingCodeState);
  let national = 0;
  let localOnly = 0;
  for (const regionIndex of regions) {
    if (regionFilter[regionIndex] === 0) continue;
    national |= getAllowedLengthMask(regionIndex, null, numberTypeFilter);
    localOnly |= getAllowedLocalOnlyLengthMask(regionIndex, null, numberTypeFilter);
  }

  return { national, localOnly };
}
