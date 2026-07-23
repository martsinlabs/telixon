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

// Unfiltered, the masks read the calling code's main region (libphonenumber testNumberLength).
export function resolvePossibilityLengthMasks(
  callingCodeState: number,
  defaultRegionIndex: number,
  regionFilter: BinaryFilter | null,
  numberTypeFilter: BinaryFilter | null,
): PossibilityLengthMasks {
  if ((regionFilter === null && numberTypeFilter === null) || callingCodeState === -1) {
    const regionIndex: number = resolvePrimaryRegionIndex(callingCodeState, defaultRegionIndex);
    return {
      national: getAllowedLengthMask(regionIndex, regionFilter, numberTypeFilter),
      localOnly: getAllowedLocalOnlyLengthMask(regionIndex, regionFilter, numberTypeFilter),
    };
  }

  // Under a filter the union over the calling code's regions keeps a number possible wherever an
  // allowed region admits it. Regions sharing a calling code do not carry the same number types,
  // and the main region alone would call a type it lacks impossible for every region.
  const regions: Uint8Array = getCallingCodeStateRegions(getResourceProvider().engine, callingCodeState);
  let national = 0;
  let localOnly = 0;
  for (const regionIndex of regions) {
    if (regionFilter !== null && regionFilter[regionIndex] === 0) continue;
    national |= getAllowedLengthMask(regionIndex, null, numberTypeFilter);
    localOnly |= getAllowedLocalOnlyLengthMask(regionIndex, null, numberTypeFilter);
  }

  return { national, localOnly };
}
