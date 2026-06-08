import {
  containsLength,
  forEachNumberTypeIndex,
  forEachStateRegion,
  forEachStateRegionWithTerminalPrefix,
  getLengthMask,
  getMaxLength,
  getNumberTypeMask,
  getNumberTypeProfileId,
  getRegionIndex,
  getTerminalPrefixNumberTypeMask,
  NumberTypeScopeLayer,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { NumberResolverSnapshot, NumberTypeProfileRef } from './models';
import { isNumberTypeAllowed } from './utils/is-number-type-allowed';

// Lazy-cached: refMapping is immutable after ensureReady.
let cachedGeneralDescTypeId: number = -1;

function isGeneralDescNumberType(
  resourceProvider: ResourceProvider,
  countryIndex: number,
  numberTypeIndex: number,
): boolean {
  if (cachedGeneralDescTypeId === -1) {
    cachedGeneralDescTypeId = resourceProvider.refMapping.numberTypes.length - 1;
  }
  return (
    resourceProvider.territorySpecTable[countryIndex]!.numberTypes[numberTypeIndex]!.type === cachedGeneralDescTypeId
  );
}

function isGeneralDescProfile(resourceProvider: ResourceProvider, profile: NumberTypeProfileRef): boolean {
  const countryIndex = getRegionIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);
  return isGeneralDescNumberType(resourceProvider, countryIndex, profile.numberTypeIndex);
}

function isCountryExcluded(snapshot: NumberResolverSnapshot, countryIndex: number): boolean {
  return snapshot.countryFilter != null && snapshot.countryFilter[countryIndex] === 0;
}

function canProfileReachLength(
  resourceProvider: ResourceProvider,
  profile: NumberTypeProfileRef,
  digitsLength: number,
): boolean {
  const lengthMask = getLengthMask(resourceProvider.numberTypeProfileLayer, profile.numberTypeProfileId);

  return digitsLength <= getMaxLength(lengthMask);
}

// Defer object allocation until the return point; keeps forEach closures non-allocating.
const SENTINEL_NOT_FOUND: number = -1;

function makeProfileRef(
  stateCountryIndex: number,
  numberTypeIndex: number,
  numberTypeProfileId: number,
): NumberTypeProfileRef {
  return { stateCountryIndex, numberTypeIndex, numberTypeProfileId };
}

// Resolves the first profile for one country whose length mask contains the current digit length.
function resolveFirstCountryProfileExact(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  stateCountryIndex: number,
  countryIndex: number,
  getCandidateMask: (layer: NumberTypeScopeLayer, stateCountryIndex: number) => number,
): NumberTypeProfileRef | null {
  const numberTypeMask = getNumberTypeMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);
  const candidateMask = getCandidateMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);
  const numberTypeFilter = snapshot.numberTypeFilter;
  const profileLayer = resourceProvider.numberTypeProfileLayer;

  let foundNumberTypeIndex: number = SENTINEL_NOT_FOUND;
  let foundProfileId: number = 0;

  forEachNumberTypeIndex(candidateMask, (numberTypeIndex: number) => {
    if (numberTypeFilter && !isNumberTypeAllowed(numberTypeFilter, countryIndex, numberTypeIndex)) return;

    const numberTypeProfileId = getNumberTypeProfileId(
      profileLayer,
      stateCountryIndex,
      numberTypeMask,
      numberTypeIndex,
    );
    const lengthMask = getLengthMask(profileLayer, numberTypeProfileId);

    if (!containsLength(lengthMask, digitsLength)) return;

    foundNumberTypeIndex = numberTypeIndex;
    foundProfileId = numberTypeProfileId;
    return true;
  });

  return foundNumberTypeIndex === SENTINEL_NOT_FOUND
    ? null
    : makeProfileRef(stateCountryIndex, foundNumberTypeIndex, foundProfileId);
}

// Resolves the first profile for one country that can still grow to a valid length.
function resolveFirstCountryProfilePartial(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  stateCountryIndex: number,
  countryIndex: number,
  getCandidateMask: (layer: NumberTypeScopeLayer, stateCountryIndex: number) => number,
): NumberTypeProfileRef | null {
  const numberTypeMask = getNumberTypeMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);
  const candidateMask = getCandidateMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);
  const numberTypeFilter = snapshot.numberTypeFilter;
  const profileLayer = resourceProvider.numberTypeProfileLayer;

  let foundNumberTypeIndex: number = SENTINEL_NOT_FOUND;
  let foundProfileId: number = 0;

  forEachNumberTypeIndex(candidateMask, (numberTypeIndex: number) => {
    if (numberTypeFilter && !isNumberTypeAllowed(numberTypeFilter, countryIndex, numberTypeIndex)) return;

    const numberTypeProfileId = getNumberTypeProfileId(
      profileLayer,
      stateCountryIndex,
      numberTypeMask,
      numberTypeIndex,
    );
    const lengthMask = getLengthMask(profileLayer, numberTypeProfileId);

    if (digitsLength > getMaxLength(lengthMask)) return;

    foundNumberTypeIndex = numberTypeIndex;
    foundProfileId = numberTypeProfileId;
    return true;
  });

  return foundNumberTypeIndex === SENTINEL_NOT_FOUND
    ? null
    : makeProfileRef(stateCountryIndex, foundNumberTypeIndex, foundProfileId);
}

function isConcreteProfile(
  resourceProvider: ResourceProvider,
  profile: NumberTypeProfileRef | null,
): profile is NumberTypeProfileRef {
  return profile !== null && !isGeneralDescProfile(resourceProvider, profile);
}

// Resolves one specific country from the current DFA state.
function resolveCountryInCurrentState(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  countryIndexToResolve: number,
): NumberTypeProfileRef | null {
  let resolved: NumberTypeProfileRef | null = null;

  forEachStateRegion(resourceProvider.countryScopeLayer, state, (stateCountryIndex, countryIndex) => {
    if (isCountryExcluded(snapshot, countryIndex) || countryIndex !== countryIndexToResolve) return;
    resolved = resolveFirstCountryProfilePartial(
      resourceProvider,
      snapshot,
      digitsLength,
      stateCountryIndex,
      countryIndex,
      getNumberTypeMask,
    );
    return true;
  });

  return resolved;
}

// Resolves one specific country from terminal-prefix states.
function resolveCountryInTerminalStates(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  countryIndexToResolve: number,
): NumberTypeProfileRef | null {
  let generalProfile: NumberTypeProfileRef | null = null;

  for (let i = terminalStateCount - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;
    let resolved: NumberTypeProfileRef | null = null;

    forEachStateRegionWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex) || countryIndex !== countryIndexToResolve) return;

        const profile = resolveFirstCountryProfilePartial(
          resourceProvider,
          snapshot,
          digitsLength,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
        );
        if (!profile) return;

        if (isGeneralDescNumberType(resourceProvider, countryIndex, profile.numberTypeIndex)) {
          if (!generalProfile) generalProfile = profile;
          return;
        }

        resolved = profile;
        return true;
      },
    );

    if (resolved) return resolved;
  }

  return generalProfile;
}

// Resolves any exact terminal-prefix match with preferred-country tie-breaks.
function resolveExactInTerminalStates(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  let generalProfile: NumberTypeProfileRef | null = null;

  for (let i = terminalStateCount - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;
    let concretePreferred: NumberTypeProfileRef | null = null;
    let concreteFallback: NumberTypeProfileRef | null = null;
    let generalPreferred: NumberTypeProfileRef | null = null;
    let generalFallback: NumberTypeProfileRef | null = null;

    forEachStateRegionWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex)) return;

        const isPreferred = preferredCountryIndex !== -1 && countryIndex === preferredCountryIndex;
        const profile = resolveFirstCountryProfileExact(
          resourceProvider,
          snapshot,
          digitsLength,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
        );
        if (!profile) return;

        if (isGeneralDescNumberType(resourceProvider, countryIndex, profile.numberTypeIndex)) {
          if (isPreferred && !generalPreferred) generalPreferred = profile;
          else if (!isPreferred && !generalFallback) generalFallback = profile;
          return;
        }

        if (isPreferred) {
          concretePreferred = profile;
        } else {
          concreteFallback = profile;
        }

        return true;
      },
    );

    const resolved = concretePreferred ?? concreteFallback;
    if (resolved) return resolved;
    if (!generalProfile) generalProfile = generalPreferred ?? generalFallback;
  }

  return generalProfile;
}

// Resolves an exact terminal-prefix match for one specific country.
interface PerTerminalStateExactResult {
  readonly concrete: NumberTypeProfileRef | null;
  readonly general: NumberTypeProfileRef | null;
}

const RESOLVE_COUNTRY_EXACT_CACHE_MAX_ENTRIES: number = 100_000;
const RESOLVE_COUNTRY_EXACT_PER_STATE_CACHE = new Map<number, Map<number, PerTerminalStateExactResult>>();
let resolveCountryExactCacheEntryCount: number = 0;

function resolveCountryExactInTerminalStates(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  countryIndexToResolve: number,
): NumberTypeProfileRef | null {
  const filtersActive: boolean = snapshot.countryFilter !== null || snapshot.numberTypeFilter !== null;

  let overallGeneralProfile: NumberTypeProfileRef | null = null;

  for (let terminalIndex = terminalStateCount - 1; terminalIndex >= 0; terminalIndex--) {
    const terminalState = snapshot.terminalStates[terminalIndex]!;
    const compositeKey = (countryIndexToResolve << 8) | digitsLength;

    let perStateResult: PerTerminalStateExactResult | undefined;

    if (!filtersActive) {
      const cachedForState = RESOLVE_COUNTRY_EXACT_PER_STATE_CACHE.get(terminalState);
      if (cachedForState !== undefined) {
        perStateResult = cachedForState.get(compositeKey);
      }
    }

    if (perStateResult === undefined) {
      let perStateConcrete: NumberTypeProfileRef | null = null;
      let perStateGeneral: NumberTypeProfileRef | null = null;

      forEachStateRegionWithTerminalPrefix(
        resourceProvider.countryScopeLayer,
        terminalState,
        (stateCountryIndex, countryIndex) => {
          if (isCountryExcluded(snapshot, countryIndex) || countryIndex !== countryIndexToResolve) return;

          const profile = resolveFirstCountryProfileExact(
            resourceProvider,
            snapshot,
            digitsLength,
            stateCountryIndex,
            countryIndex,
            getTerminalPrefixNumberTypeMask,
          );
          if (!profile) return;

          if (isGeneralDescNumberType(resourceProvider, countryIndex, profile.numberTypeIndex)) {
            if (!perStateGeneral) perStateGeneral = profile;
            return;
          }

          perStateConcrete = profile;
          return true;
        },
      );

      perStateResult = { concrete: perStateConcrete, general: perStateGeneral };

      if (!filtersActive) {
        if (resolveCountryExactCacheEntryCount >= RESOLVE_COUNTRY_EXACT_CACHE_MAX_ENTRIES) {
          RESOLVE_COUNTRY_EXACT_PER_STATE_CACHE.clear();
          resolveCountryExactCacheEntryCount = 0;
        }
        let cachedForState = RESOLVE_COUNTRY_EXACT_PER_STATE_CACHE.get(terminalState);
        if (cachedForState === undefined) {
          cachedForState = new Map();
          RESOLVE_COUNTRY_EXACT_PER_STATE_CACHE.set(terminalState, cachedForState);
        }
        if (!cachedForState.has(compositeKey)) resolveCountryExactCacheEntryCount++;
        cachedForState.set(compositeKey, perStateResult);
      }
    }

    if (perStateResult.concrete !== null) return perStateResult.concrete;
    if (perStateResult.general !== null && overallGeneralProfile === null) {
      overallGeneralProfile = perStateResult.general;
    }
  }

  return overallGeneralProfile;
}

// Resolves any non-preferred country from the current DFA state.
function resolveFallbackInCurrentState(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  let resolved: NumberTypeProfileRef | null = null;
  let generalProfile: NumberTypeProfileRef | null = null;

  forEachStateRegion(resourceProvider.countryScopeLayer, state, (stateCountryIndex, countryIndex) => {
    if (isCountryExcluded(snapshot, countryIndex) || countryIndex === preferredCountryIndex) return;

    const profile = resolveFirstCountryProfilePartial(
      resourceProvider,
      snapshot,
      digitsLength,
      stateCountryIndex,
      countryIndex,
      getNumberTypeMask,
    );
    if (!profile) return;

    if (isGeneralDescNumberType(resourceProvider, countryIndex, profile.numberTypeIndex)) {
      if (!generalProfile) generalProfile = profile;
      return;
    }

    resolved = profile;
    return true;
  });

  return resolved ?? generalProfile;
}

// Resolves any non-preferred country from terminal-prefix states.
function resolveFallbackInTerminalStates(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  let generalProfile: NumberTypeProfileRef | null = null;

  for (let i = terminalStateCount - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;
    let resolved: NumberTypeProfileRef | null = null;
    let terminalGeneralProfile: NumberTypeProfileRef | null = null;

    forEachStateRegionWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex) || countryIndex === preferredCountryIndex) return;

        const profile = resolveFirstCountryProfilePartial(
          resourceProvider,
          snapshot,
          digitsLength,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
        );
        if (!profile) return;

        if (isGeneralDescNumberType(resourceProvider, countryIndex, profile.numberTypeIndex)) {
          if (!terminalGeneralProfile) terminalGeneralProfile = profile;
          return;
        }

        resolved = profile;
        return true;
      },
    );

    if (resolved) return resolved;
    if (!generalProfile) generalProfile = terminalGeneralProfile;
  }

  return generalProfile;
}

const TERMINAL_STATE_UNIQUE_CONCRETE_CACHE_MAX_ENTRIES: number = 100_000;
const TERMINAL_STATE_UNIQUE_CONCRETE_CACHE = new Map<number, Map<number, NumberTypeProfileRef | null>>();
let terminalStateUniqueConcreteCacheEntryCount: number = 0;

// Finds a uniquely concrete terminal-prefix country at the current digit position.
function resolveUniqueConcreteProfileInTerminalStates(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
): NumberTypeProfileRef | null {
  const filtersActive: boolean = snapshot.countryFilter !== null || snapshot.numberTypeFilter !== null;

  for (let terminalIndex = terminalStateCount - 1; terminalIndex >= 0; terminalIndex--) {
    const terminalState = snapshot.terminalStates[terminalIndex]!;

    if (!filtersActive) {
      const cachedForState = TERMINAL_STATE_UNIQUE_CONCRETE_CACHE.get(terminalState);

      if (cachedForState !== undefined) {
        const cachedForLength = cachedForState.get(digitsLength);

        if (cachedForLength !== undefined) {
          if (cachedForLength !== null) return cachedForLength;
          continue;
        }
      }
    }

    let uniqueProfile: NumberTypeProfileRef | null = null;
    let uniqueCountryIndex = -1;
    let hasMultipleCountries = false;

    forEachStateRegionWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex)) return;

        const profile = resolveFirstCountryProfilePartial(
          resourceProvider,
          snapshot,
          digitsLength,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
        );

        if (!profile || isGeneralDescNumberType(resourceProvider, countryIndex, profile.numberTypeIndex)) return;

        if (uniqueCountryIndex === -1) {
          uniqueCountryIndex = countryIndex;
          uniqueProfile = profile;
          return;
        }

        if (uniqueCountryIndex !== countryIndex) {
          hasMultipleCountries = true;
          return true;
        }
      },
    );

    const result: NumberTypeProfileRef | null = uniqueProfile !== null && !hasMultipleCountries ? uniqueProfile : null;

    if (!filtersActive) {
      if (terminalStateUniqueConcreteCacheEntryCount >= TERMINAL_STATE_UNIQUE_CONCRETE_CACHE_MAX_ENTRIES) {
        TERMINAL_STATE_UNIQUE_CONCRETE_CACHE.clear();
        terminalStateUniqueConcreteCacheEntryCount = 0;
      }
      let cachedForState = TERMINAL_STATE_UNIQUE_CONCRETE_CACHE.get(terminalState);
      if (cachedForState === undefined) {
        cachedForState = new Map();
        TERMINAL_STATE_UNIQUE_CONCRETE_CACHE.set(terminalState, cachedForState);
      }
      if (!cachedForState.has(digitsLength)) terminalStateUniqueConcreteCacheEntryCount++;
      cachedForState.set(digitsLength, result);
    }

    if (result !== null) return result;
  }

  return null;
}

// Finds a uniquely concrete current-state country at the current digit position.
function resolveUniqueConcreteProfileInCurrentState(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
): NumberTypeProfileRef | null {
  let uniqueProfile: NumberTypeProfileRef | null = null;
  let uniqueCountryIndex = -1;
  let hasMultipleCountries = false;

  forEachStateRegion(resourceProvider.countryScopeLayer, state, (stateCountryIndex, countryIndex) => {
    if (isCountryExcluded(snapshot, countryIndex)) return;

    const profile = resolveFirstCountryProfilePartial(
      resourceProvider,
      snapshot,
      digitsLength,
      stateCountryIndex,
      countryIndex,
      getNumberTypeMask,
    );
    if (!profile || isGeneralDescNumberType(resourceProvider, countryIndex, profile.numberTypeIndex)) return;

    if (uniqueCountryIndex === -1) {
      uniqueCountryIndex = countryIndex;
      uniqueProfile = profile;
    } else if (uniqueCountryIndex !== countryIndex) {
      hasMultipleCountries = true;
      return true;
    }
  });

  return hasMultipleCountries ? null : uniqueProfile;
}

// Resolves the anchor candidate for one digit position: terminal-prefix uniqueness first, then current-state uniqueness.
function resolveAnchorProfileAtPosition(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  terminalStateCount: number,
  isAlive: boolean,
): NumberTypeProfileRef | null {
  const terminalProfile = resolveUniqueConcreteProfileInTerminalStates(
    resourceProvider,
    snapshot,
    digitsLength,
    terminalStateCount,
  );
  if (terminalProfile !== null) return terminalProfile;

  if (!isAlive) return null;

  return resolveUniqueConcreteProfileInCurrentState(resourceProvider, snapshot, state, digitsLength);
}

// Strict mode checks only the preferred country: exact, current partial, then terminal partial.
function resolveStrictPreferredMatch(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
  isAlive: boolean,
  hasTerminals: boolean,
): NumberTypeProfileRef | null {
  let generalProfile: NumberTypeProfileRef | null = null;

  if (hasTerminals) {
    const profile = resolveCountryExactInTerminalStates(
      resourceProvider,
      snapshot,
      digitsLength,
      terminalStateCount,
      preferredCountryIndex,
    );
    if (isConcreteProfile(resourceProvider, profile)) return profile;
    if (profile !== null) generalProfile = profile;
  }

  if (isAlive) {
    const profile = resolveCountryInCurrentState(
      resourceProvider,
      snapshot,
      state,
      digitsLength,
      preferredCountryIndex,
    );
    if (isConcreteProfile(resourceProvider, profile)) return profile;
    if (profile !== null && generalProfile === null) generalProfile = profile;
  }

  if (hasTerminals) {
    const profile = resolveCountryInTerminalStates(
      resourceProvider,
      snapshot,
      digitsLength,
      terminalStateCount,
      preferredCountryIndex,
    );
    if (isConcreteProfile(resourceProvider, profile)) return profile;
    if (profile !== null && generalProfile === null) generalProfile = profile;
  }

  return generalProfile;
}

// Step 1: an anchored concrete exact match always wins before any partial candidate is considered.
function resolveAnchoredConcreteExactMatch(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  anchoredCountryIndex: number,
): NumberTypeProfileRef | null {
  if (anchoredCountryIndex === -1) return null;

  const profile = resolveCountryExactInTerminalStates(
    resourceProvider,
    snapshot,
    digitsLength,
    terminalStateCount,
    anchoredCountryIndex,
  );

  return profile !== null && !isGeneralDescProfile(resourceProvider, profile) ? profile : null;
}

// Step 3: preferred concrete partial matches outrank anchored partial matches.
function resolvePreferredConcretePartialMatch(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
  isAlive: boolean,
  hasTerminals: boolean,
): NumberTypeProfileRef | null {
  if (preferredCountryIndex === -1) return null;

  if (isAlive) {
    const profile = resolveCountryInCurrentState(
      resourceProvider,
      snapshot,
      state,
      digitsLength,
      preferredCountryIndex,
    );
    if (isConcreteProfile(resourceProvider, profile)) return profile;
  }

  if (hasTerminals) {
    const profile = resolveCountryInTerminalStates(
      resourceProvider,
      snapshot,
      digitsLength,
      terminalStateCount,
      preferredCountryIndex,
    );
    if (isConcreteProfile(resourceProvider, profile)) return profile;
  }

  return null;
}

// Step 4: anchored partial keeps its country before generic fallback candidates.
function resolveAnchoredPartialChain(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
  anchoredCountryIndex: number,
  isAlive: boolean,
  hasTerminals: boolean,
): NumberTypeProfileRef | null {
  if (anchoredCountryIndex === -1 || anchoredCountryIndex === preferredCountryIndex) return null;

  let generalProfile: NumberTypeProfileRef | null = null;

  if (isAlive) {
    const profile = resolveCountryInCurrentState(resourceProvider, snapshot, state, digitsLength, anchoredCountryIndex);
    if (isConcreteProfile(resourceProvider, profile)) return profile;
    if (profile !== null) generalProfile = profile;
  }

  if (hasTerminals) {
    const profile = resolveCountryInTerminalStates(
      resourceProvider,
      snapshot,
      digitsLength,
      terminalStateCount,
      anchoredCountryIndex,
    );
    if (isConcreteProfile(resourceProvider, profile)) return profile;
    if (profile !== null && generalProfile === null) generalProfile = profile;
  }

  return generalProfile;
}

// Step 5: if preferred and anchored country do not resolve, use any concrete non-preferred partial match.
function resolveFallbackConcretePartialMatch(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
  isAlive: boolean,
  hasTerminals: boolean,
): NumberTypeProfileRef | null {
  if (isAlive) {
    const profile = resolveFallbackInCurrentState(
      resourceProvider,
      snapshot,
      state,
      digitsLength,
      preferredCountryIndex,
    );
    if (isConcreteProfile(resourceProvider, profile)) return profile;
  }

  if (hasTerminals) {
    const profile = resolveFallbackInTerminalStates(
      resourceProvider,
      snapshot,
      digitsLength,
      terminalStateCount,
      preferredCountryIndex,
    );
    if (isConcreteProfile(resourceProvider, profile)) return profile;
  }

  return null;
}

// Step 6: returns the first generalDesc in chain order (preferred current -> preferred terminal -> other current -> other terminal).
function resolveGeneralDescPartialFallback(
  resourceProvider: ResourceProvider,
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
  isAlive: boolean,
  hasTerminals: boolean,
): NumberTypeProfileRef | null {
  let generalProfile: NumberTypeProfileRef | null = null;

  if (preferredCountryIndex !== -1) {
    if (isAlive) {
      const profile = resolveCountryInCurrentState(
        resourceProvider,
        snapshot,
        state,
        digitsLength,
        preferredCountryIndex,
      );
      if (isConcreteProfile(resourceProvider, profile)) return profile;
      if (profile !== null) generalProfile = profile;
    }

    if (hasTerminals) {
      const profile = resolveCountryInTerminalStates(
        resourceProvider,
        snapshot,
        digitsLength,
        terminalStateCount,
        preferredCountryIndex,
      );
      if (isConcreteProfile(resourceProvider, profile)) return profile;
      if (profile !== null && generalProfile === null) generalProfile = profile;
    }
  }

  if (isAlive) {
    const profile = resolveFallbackInCurrentState(
      resourceProvider,
      snapshot,
      state,
      digitsLength,
      preferredCountryIndex,
    );
    if (isConcreteProfile(resourceProvider, profile)) return profile;
    if (profile !== null && generalProfile === null) generalProfile = profile;
  }

  if (hasTerminals) {
    const profile = resolveFallbackInTerminalStates(
      resourceProvider,
      snapshot,
      digitsLength,
      terminalStateCount,
      preferredCountryIndex,
    );
    if (isConcreteProfile(resourceProvider, profile)) return profile;
    if (profile !== null && generalProfile === null) generalProfile = profile;
  }

  return generalProfile;
}

export function resolveLatestConcreteCountryIndex(
  snapshot: NumberResolverSnapshot,
  nationalStates: readonly number[],
  terminalStateEnds: readonly number[],
): number {
  const totalDigits = snapshot.nationalDigits.length;
  if (totalDigits === 0) return -1;

  const resourceProvider = getResourceProvider();
  const deadStateId = resourceProvider.graphLayer.deadStateId;

  for (let digitPosition = totalDigits - 1; digitPosition >= 0; digitPosition--) {
    const state = nationalStates[digitPosition]!;
    const profile = resolveAnchorProfileAtPosition(
      resourceProvider,
      snapshot,
      state,
      digitPosition + 1,
      terminalStateEnds[digitPosition]!,
      state !== deadStateId,
    );

    if (profile === null) continue;
    if (!canProfileReachLength(resourceProvider, profile, totalDigits)) continue;

    return getRegionIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);
  }

  return -1;
}

/**
 * @internal
 * Resolves one profile for the current snapshot.
 * Pass `preferredCountryIndex = -1` when there is no preferred country.
 *
 * Terms:
 * - concrete: any type except `generalDesc`
 * - exact: terminal-prefix match at the current length
 * - partial: current-state or terminal-prefix match that can still grow to the current length
 * - anchored country: the latest unique concrete country from `resolveLatestConcreteCountryIndex()`
 *
 * Non-strict order:
 * 1. anchored concrete exact
 * 2. any exact: preferred concrete -> other concrete -> preferred generalDesc -> other generalDesc
 * 3. preferred concrete partial (current-state first, then terminal-prefix)
 * 4. anchored partial: concrete wins immediately; if only generalDesc resolves, it is returned
 *    and steps 5–6 are skipped
 * 5. other concrete partial (current-state first, then terminal-prefix)
 * 6. first generalDesc from: preferred current-state -> preferred terminal-prefix
 *    -> other current-state -> other terminal-prefix
 *
 * Strict order:
 * 1. preferred concrete exact
 * 2. preferred concrete current-state partial
 * 3. preferred concrete terminal-prefix partial
 * 4. first preferred generalDesc seen in the above order (exact -> current-state -> terminal-prefix)
 */
export function resolveFirstMatchingNumberTypeProfile(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
  anchoredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();
  const state = snapshot.state;
  const digitsLength = snapshot.nationalDigits.length;
  const terminalStateCount = snapshot.terminalStates.length;
  const isAlive = state !== resourceProvider.graphLayer.deadStateId;
  const hasTerminals = terminalStateCount > 0;

  // Strict mode never leaves the preferred country.
  if (snapshot.strict && preferredCountryIndex !== -1) {
    return resolveStrictPreferredMatch(
      resourceProvider,
      snapshot,
      state,
      digitsLength,
      terminalStateCount,
      preferredCountryIndex,
      isAlive,
      hasTerminals,
    );
  }

  // Exact matches always win before any partial chain.
  if (hasTerminals) {
    const anchoredExact = resolveAnchoredConcreteExactMatch(
      resourceProvider,
      snapshot,
      digitsLength,
      terminalStateCount,
      anchoredCountryIndex,
    );
    if (anchoredExact !== null) return anchoredExact;

    // Step 2: among exact matches, use the deterministic preferred-then-fallback order.
    const anyExact = resolveExactInTerminalStates(
      resourceProvider,
      snapshot,
      digitsLength,
      terminalStateCount,
      preferredCountryIndex,
    );
    if (anyExact !== null) return anyExact;
  }

  // Preferred concrete partial wins while the number is still incomplete.
  const preferredConcrete = resolvePreferredConcretePartialMatch(
    resourceProvider,
    snapshot,
    state,
    digitsLength,
    terminalStateCount,
    preferredCountryIndex,
    isAlive,
    hasTerminals,
  );
  if (preferredConcrete !== null) return preferredConcrete;

  // Then keep the anchored country alive before trying other countries.
  const anchoredProfile = resolveAnchoredPartialChain(
    resourceProvider,
    snapshot,
    state,
    digitsLength,
    terminalStateCount,
    preferredCountryIndex,
    anchoredCountryIndex,
    isAlive,
    hasTerminals,
  );
  if (anchoredProfile !== null) return anchoredProfile;

  const fallbackConcrete = resolveFallbackConcretePartialMatch(
    resourceProvider,
    snapshot,
    state,
    digitsLength,
    terminalStateCount,
    preferredCountryIndex,
    isAlive,
    hasTerminals,
  );
  if (fallbackConcrete !== null) return fallbackConcrete;

  return resolveGeneralDescPartialFallback(
    resourceProvider,
    snapshot,
    state,
    digitsLength,
    terminalStateCount,
    preferredCountryIndex,
    isAlive,
    hasTerminals,
  );
}

export function __clearProfileCaches(): void {
  TERMINAL_STATE_UNIQUE_CONCRETE_CACHE.clear();
  terminalStateUniqueConcreteCacheEntryCount = 0;
  RESOLVE_COUNTRY_EXACT_PER_STATE_CACHE.clear();
  resolveCountryExactCacheEntryCount = 0;
  cachedGeneralDescTypeId = -1;
}
