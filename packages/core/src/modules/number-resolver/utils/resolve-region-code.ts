import {
  containsLength,
  forEachNumberTypeIndex,
  forEachStateRegionWithTerminalPrefix,
  getCallingCodeStateRegions,
  getLengthMask,
  getNextGraphState,
  getNumberTypeMask,
  getNumberTypeProfileId,
  getTerminalPrefixNumberTypeMask,
  GraphLayer,
  hasTerminalPrefix,
  RegionId,
  regionLeadingDigitsSatisfied,
  TerritorySpec,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

const GENERAL_DESC = 'GENERAL_DESC';

// Terminal states of the national number walked unfiltered, so region resolution stays independent of
// any active number-type filter (libphonenumber resolves the region purely from the number).
function collectTerminalStates(graph: GraphLayer, callingCodeState: number, nationalDigits: string): number[] {
  const terminalStates: number[] = [];
  let state: number = callingCodeState;
  for (let i = 0; i < nationalDigits.length; i++) {
    state = getNextGraphState(graph, state, nationalDigits.charCodeAt(i) - 48);
    if (state === graph.deadStateId) break;
    if (hasTerminalPrefix(graph, state)) terminalStates.push(state);
  }
  return terminalStates;
}

// Main region match via the DFA terminal scope (same acceptance getNumberType uses): the region has a
// non-GENERAL_DESC type valid at one of the number's terminal states with a matching length. Equivalent
// to fully matching a specific type's nationalNumberPattern, without shipping the regex.
function mainRegionMatches(
  countryIndex: number,
  territory: TerritorySpec,
  length: number,
  terminalStates: readonly number[],
): boolean {
  const { numberTypeScopeLayer, numberTypeProfileLayer, countryScopeLayer, refMapping } = getResourceProvider();

  for (const terminalState of terminalStates) {
    let matched = false;
    forEachStateRegionWithTerminalPrefix(countryScopeLayer, terminalState, (stateCountryIndex, stateCountry) => {
      if (stateCountry !== countryIndex) return;

      const numberTypeMask: number = getNumberTypeMask(numberTypeScopeLayer, stateCountryIndex);
      const candidateMask: number = getTerminalPrefixNumberTypeMask(numberTypeScopeLayer, stateCountryIndex);

      forEachNumberTypeIndex(candidateMask, (numberTypeIndex: number) => {
        const typeId: number = territory.numberTypes[numberTypeIndex]!.type;
        if (refMapping.numberTypes[typeId] === GENERAL_DESC) return;

        const profileId: number = getNumberTypeProfileId(
          numberTypeProfileLayer,
          stateCountryIndex,
          numberTypeMask,
          numberTypeIndex,
        );
        if (!containsLength(getLengthMask(numberTypeProfileLayer, profileId), length)) return;

        matched = true;
        return true;
      });

      if (matched) return true;
    });
    if (matched) return true;
  }
  return false;
}

// libphonenumber getRegionCodeForNumberFromRegionList: a non-main region matches by its leadingDigits
// prefix; the main region (no leadingDigits) matches when a specific type accepts the number. GENERAL_DESC
// is excluded: its acceptance is broad and would attribute foreign numbers to the main region.
function matchesRegion(
  countryIndex: number,
  territory: TerritorySpec,
  nationalDigits: string,
  terminalStates: readonly number[],
): boolean {
  if (territory.leadingDigits) {
    const { regionSelectLayer, refMapping } = getResourceProvider();
    const callingCodeIndex: number | undefined = refMapping.callingCodes.keyToIndex[Number(territory.countryCode)];
    if (callingCodeIndex === undefined) return false;
    return regionLeadingDigitsSatisfied(regionSelectLayer, callingCodeIndex, countryIndex, nationalDigits);
  }
  return mainRegionMatches(countryIndex, territory, nationalDigits.length, terminalStates);
}

const REGION_CODE_CACHE_MAX_ENTRIES: number = 100_000;
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

  const { refMapping, callingCodeLayer, territorySpecTable, graphLayer } = getResourceProvider();
  const regions: Uint8Array = getCallingCodeStateRegions(callingCodeLayer, callingCodeState);

  let resolvedRegion: RegionId | null;
  if (regions.length === 1) {
    resolvedRegion = refMapping.regions.indexToKey[regions[0]!] ?? null;
  } else {
    resolvedRegion = null;
    const terminalStates: readonly number[] = collectTerminalStates(graphLayer, callingCodeState, nationalDigits);
    for (const countryIndex of regions) {
      const territory: TerritorySpec | undefined = territorySpecTable[countryIndex];
      if (territory && matchesRegion(countryIndex, territory, nationalDigits, terminalStates)) {
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
