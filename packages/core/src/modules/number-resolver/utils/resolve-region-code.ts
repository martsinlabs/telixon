import { getCallingCodeStateRegions, RegionId, TerritorySpec } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { fullPattern } from './full-pattern';
import { matchesLeadingDigits } from './matches-leading-digits';

const GENERAL_DESC = 'GENERAL_DESC';

// libphonenumber getRegionCodeForNumberFromRegionList: a non-main region matches by its leadingDigits
// prefix; the main region (no leadingDigits) matches when a specific type pattern fully matches.
// GENERAL_DESC is excluded: its pattern is broad and would attribute foreign numbers to the main region.
function matchesRegion(territory: TerritorySpec, nationalDigits: string): boolean {
  if (territory.leadingDigits) {
    return matchesLeadingDigits(territory.leadingDigits, nationalDigits);
  }

  const { refMapping } = getResourceProvider();
  for (const numberType of territory.numberTypes) {
    if (refMapping.numberTypes[numberType.type] === GENERAL_DESC) continue;
    if (fullPattern(numberType.nationalNumberPattern).test(nationalDigits)) return true;
  }
  return false;
}

const REGION_CODE_CACHE_MAX_ENTRIES: number = 50_000;
const REGION_CODE_CACHE = new Map<number, Map<string, RegionId | null>>();
let regionCodeCacheEntryCount: number = 0;

// libphonenumber getRegionCodeForNumber: the first region in the calling code's main-first order that
// the number matches, or null. Shared by getCountry and the input controller so they always agree.
export function resolveRegionCode(callingCodeState: number, nationalDigits: string): RegionId | null {
  if (callingCodeState === -1) return null;

  const cachedForState = REGION_CODE_CACHE.get(callingCodeState);
  if (cachedForState !== undefined) {
    const cachedResult = cachedForState.get(nationalDigits);
    if (cachedResult !== undefined) return cachedResult;
  }

  const { refMapping, callingCodeLayer, territorySpecTable } = getResourceProvider();
  const regions: Uint8Array = getCallingCodeStateRegions(callingCodeLayer, callingCodeState);

  let resolvedRegion: RegionId | null;
  if (regions.length === 1) {
    resolvedRegion = refMapping.regions.indexToKey[regions[0]!] ?? null;
  } else {
    resolvedRegion = null;
    for (const countryIndex of regions) {
      const territory: TerritorySpec | undefined = territorySpecTable[countryIndex];
      if (territory && matchesRegion(territory, nationalDigits)) {
        resolvedRegion = refMapping.regions.indexToKey[countryIndex] ?? null;
        break;
      }
    }
  }

  if (regionCodeCacheEntryCount >= REGION_CODE_CACHE_MAX_ENTRIES) {
    REGION_CODE_CACHE.clear();
    regionCodeCacheEntryCount = 0;
  }
  let cacheForState = REGION_CODE_CACHE.get(callingCodeState);
  if (cacheForState === undefined) {
    cacheForState = new Map();
    REGION_CODE_CACHE.set(callingCodeState, cacheForState);
  }
  if (!cacheForState.has(nationalDigits)) regionCodeCacheEntryCount++;
  cacheForState.set(nationalDigits, resolvedRegion);

  return resolvedRegion;
}

export function __clearRegionCodeCache(): void {
  REGION_CODE_CACHE.clear();
  regionCodeCacheEntryCount = 0;
}
