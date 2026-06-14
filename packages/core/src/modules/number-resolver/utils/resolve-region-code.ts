import {
  forEachExactRegion,
  getCallingCodeStateRegions,
  getMetadataRegionCallingCode,
  getVerdict,
  isRegionLeadingDigitsSatisfied,
  RegionId,
  VERDICT_LENGTH_COUNT,
  verdictIsDecided,
  verdictRegion,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveExactMatchedTypeIdMask } from './resolve-exact-matched-types';

// Verdict region payload meaning "no region" (engine verdict contract).
const VERDICT_REGION_NONE = 255;

// Regions with any exact acceptance at (endState, length), collected in one scan of the state's exact list.
function collectExactRegions(endState: number, nationalLength: number): number[] {
  const exactRegions: number[] = [];
  forEachExactRegion(getResourceProvider().engine, endState, nationalLength, (regionIndex) => {
    exactRegions.push(regionIndex);
  });
  return exactRegions;
}

// libphonenumber getRegionCodeForNumberFromRegionList: a region matches by leadingDigits, or (no leadingDigits) by a concrete type accepting the number.
function matchesRegion(
  countryIndex: number,
  nationalDigits: string,
  endState: number,
  exactRegions: readonly number[],
): boolean {
  const resourceProvider = getResourceProvider();
  if (resourceProvider.regionHasLeadingDigits[countryIndex]) {
    const callingCode: number = getMetadataRegionCallingCode(resourceProvider.engine, countryIndex);
    const callingCodeIndex: number | undefined = resourceProvider.callingCodeIndexByCode[callingCode];
    if (callingCodeIndex === undefined) return false;
    return isRegionLeadingDigitsSatisfied(resourceProvider.engine, callingCodeIndex, countryIndex, nationalDigits);
  }
  if (!exactRegions.includes(countryIndex)) return false;
  return resolveExactMatchedTypeIdMask(endState, nationalDigits.length, countryIndex, null) !== 0;
}

// libphonenumber getRegionCodeForNumber: first region (main-first) the number matches, or null; fallback behind baked verdicts.
export function resolveRegionCode(callingCodeState: number, endState: number, nationalDigits: string): RegionId | null {
  if (callingCodeState === -1) return null;

  const resourceProvider = getResourceProvider();
  const regions: Uint8Array = getCallingCodeStateRegions(resourceProvider.engine, callingCodeState);

  if (regions.length === 1) {
    return resourceProvider.regionIds[regions[0]!] ?? null;
  }

  const exactRegions: number[] = collectExactRegions(endState, nationalDigits.length);
  for (const countryIndex of regions) {
    if (matchesRegion(countryIndex, nationalDigits, endState, exactRegions)) {
      return resourceProvider.regionIds[countryIndex] ?? null;
    }
  }

  return null;
}

// Verdict-first region resolution: one baked lookup at (endState, length), else the explicit resolution above.
export function resolveRegionCodeFast(
  callingCodeState: number,
  endState: number,
  nationalDigits: string,
): RegionId | null {
  const length: number = nationalDigits.length;

  if (length < VERDICT_LENGTH_COUNT) {
    const verdict: number = getVerdict(getResourceProvider().engine, endState, length);
    if (verdictIsDecided(verdict)) {
      const regionIndex: number = verdictRegion(verdict);
      if (regionIndex === VERDICT_REGION_NONE) return null;
      return getResourceProvider().regionIds[regionIndex] ?? null;
    }
  }

  return resolveRegionCode(callingCodeState, endState, nationalDigits);
}
