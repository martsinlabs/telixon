import {
  containsLength,
  forEachNumberTypeIndex,
  forEachStateCountry,
  forEachStateCountryWithTerminalPrefix,
  getCountryIndex,
  getLengthMask,
  getMaxLength,
  getNumberTypeMask,
  getNumberTypeProfileId,
  getTerminalPrefixNumberTypeMask,
  NumberTypeScopeLayer,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { NumberResolverSnapshot, NumberTypeProfileRef } from './models';
import { isNumberTypeAllowed } from './utils/is-number-type-allowed';

function isGeneralDescNumberType(countryIndex: number, numberTypeIndex: number): boolean {
  const resourceProvider = getResourceProvider();
  const generalDescTypeId = resourceProvider.refMapping.numberTypes.length - 1;
  return resourceProvider.territorySpecTable[countryIndex]!.numberTypes[numberTypeIndex]!.type === generalDescTypeId;
}

function isGeneralDescProfile(profile: NumberTypeProfileRef): boolean {
  const resourceProvider = getResourceProvider();
  const countryIndex = getCountryIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);
  return isGeneralDescNumberType(countryIndex, profile.numberTypeIndex);
}

function isCountryExcluded(snapshot: NumberResolverSnapshot, countryIndex: number): boolean {
  return snapshot.countryFilter != null && snapshot.countryFilter[countryIndex] === 0;
}

function canProfileReachLength(profile: NumberTypeProfileRef, digitsLength: number): boolean {
  const resourceProvider = getResourceProvider();
  const lengthMask = getLengthMask(resourceProvider.numberTypeProfileLayer, profile.numberTypeProfileId);

  return digitsLength <= getMaxLength(lengthMask);
}

// Resolves the first profile for one country that is still valid at the current length.
function resolveFirstCountryProfile(
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  stateCountryIndex: number,
  countryIndex: number,
  getCandidateMask: (layer: NumberTypeScopeLayer, stateCountryIndex: number) => number,
  isCompleted: boolean,
): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();
  const numberTypeMask = getNumberTypeMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);
  const candidateMask = getCandidateMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);
  let resolved: NumberTypeProfileRef | null = null;

  forEachNumberTypeIndex(candidateMask, (numberTypeIndex) => {
    if (snapshot.numberTypeFilter && !isNumberTypeAllowed(snapshot.numberTypeFilter, countryIndex, numberTypeIndex)) {
      return;
    }

    const numberTypeProfileId = getNumberTypeProfileId(
      resourceProvider.numberTypeProfileLayer,
      stateCountryIndex,
      numberTypeMask,
      numberTypeIndex,
    );

    const lengthMask = getLengthMask(resourceProvider.numberTypeProfileLayer, numberTypeProfileId);

    if (isCompleted) {
      if (!containsLength(lengthMask, digitsLength)) return;
    } else if (digitsLength > getMaxLength(lengthMask)) {
      return;
    }

    resolved = { stateCountryIndex, numberTypeIndex, numberTypeProfileId };
    return true;
  });

  return resolved;
}

function isConcreteProfile(profile: NumberTypeProfileRef | null): profile is NumberTypeProfileRef {
  return profile !== null && !isGeneralDescProfile(profile);
}

// Resolves one specific country from the current DFA state.
function resolveCountryInCurrentState(
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  countryIndexToResolve: number,
): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();
  let resolved: NumberTypeProfileRef | null = null;

  forEachStateCountry(resourceProvider.countryScopeLayer, state, (stateCountryIndex, countryIndex) => {
    if (isCountryExcluded(snapshot, countryIndex) || countryIndex !== countryIndexToResolve) return;
    resolved = resolveFirstCountryProfile(
      snapshot,
      digitsLength,
      stateCountryIndex,
      countryIndex,
      getNumberTypeMask,
      false,
    );
    return true;
  });

  return resolved;
}

// Resolves one specific country from terminal-prefix states.
function resolveCountryInTerminalStates(
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  countryIndexToResolve: number,
): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();
  let generalProfile: NumberTypeProfileRef | null = null;

  for (let i = terminalStateCount - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;
    let resolved: NumberTypeProfileRef | null = null;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex) || countryIndex !== countryIndexToResolve) return;

        const profile = resolveFirstCountryProfile(
          snapshot,
          digitsLength,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
          false,
        );
        if (!profile) return;

        if (isGeneralDescNumberType(countryIndex, profile.numberTypeIndex)) {
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
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();
  let generalProfile: NumberTypeProfileRef | null = null;

  for (let i = terminalStateCount - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;
    let concretePreferred: NumberTypeProfileRef | null = null;
    let concreteFallback: NumberTypeProfileRef | null = null;
    let generalPreferred: NumberTypeProfileRef | null = null;
    let generalFallback: NumberTypeProfileRef | null = null;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex)) return;

        const isPreferred = preferredCountryIndex !== -1 && countryIndex === preferredCountryIndex;
        const profile = resolveFirstCountryProfile(
          snapshot,
          digitsLength,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
          true,
        );
        if (!profile) return;

        if (isGeneralDescNumberType(countryIndex, profile.numberTypeIndex)) {
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
function resolveCountryExactInTerminalStates(
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  countryIndexToResolve: number,
): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();
  let generalProfile: NumberTypeProfileRef | null = null;

  for (let i = terminalStateCount - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;
    let concreteProfile: NumberTypeProfileRef | null = null;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex) || countryIndex !== countryIndexToResolve) return;

        const profile = resolveFirstCountryProfile(
          snapshot,
          digitsLength,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
          true,
        );
        if (!profile) return;

        if (isGeneralDescNumberType(countryIndex, profile.numberTypeIndex)) {
          if (!generalProfile) generalProfile = profile;
          return;
        }

        concreteProfile = profile;
        return true;
      },
    );

    if (concreteProfile) return concreteProfile;
  }

  return generalProfile;
}

// Resolves any non-preferred country from the current DFA state.
function resolveFallbackInCurrentState(
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();
  let resolved: NumberTypeProfileRef | null = null;
  let generalProfile: NumberTypeProfileRef | null = null;

  forEachStateCountry(resourceProvider.countryScopeLayer, state, (stateCountryIndex, countryIndex) => {
    if (isCountryExcluded(snapshot, countryIndex) || countryIndex === preferredCountryIndex) return;

    const profile = resolveFirstCountryProfile(
      snapshot,
      digitsLength,
      stateCountryIndex,
      countryIndex,
      getNumberTypeMask,
      false,
    );
    if (!profile) return;

    if (isGeneralDescNumberType(countryIndex, profile.numberTypeIndex)) {
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
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();
  let generalProfile: NumberTypeProfileRef | null = null;

  for (let i = terminalStateCount - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;
    let resolved: NumberTypeProfileRef | null = null;
    let terminalGeneralProfile: NumberTypeProfileRef | null = null;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex) || countryIndex === preferredCountryIndex) return;

        const profile = resolveFirstCountryProfile(
          snapshot,
          digitsLength,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
          false,
        );
        if (!profile) return;

        if (isGeneralDescNumberType(countryIndex, profile.numberTypeIndex)) {
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

// Finds a uniquely concrete terminal-prefix country at the current digit position.
function resolveUniqueConcreteProfileInTerminalStates(
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();

  for (let i = terminalStateCount - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;
    let uniqueProfile: NumberTypeProfileRef | null = null;
    let uniqueCountryIndex = -1;
    let hasMultipleCountries = false;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex)) return;

        const profile = resolveFirstCountryProfile(
          snapshot,
          digitsLength,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
          false,
        );

        if (!profile || isGeneralDescNumberType(countryIndex, profile.numberTypeIndex)) return;

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

    if (uniqueProfile !== null && !hasMultipleCountries) return uniqueProfile;
  }

  return null;
}

// Finds a uniquely concrete current-state country at the current digit position.
function resolveUniqueConcreteProfileInCurrentState(
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();
  let uniqueProfile: NumberTypeProfileRef | null = null;
  let uniqueCountryIndex = -1;
  let hasMultipleCountries = false;

  forEachStateCountry(resourceProvider.countryScopeLayer, state, (stateCountryIndex, countryIndex) => {
    if (isCountryExcluded(snapshot, countryIndex)) return;

    const profile = resolveFirstCountryProfile(
      snapshot,
      digitsLength,
      stateCountryIndex,
      countryIndex,
      getNumberTypeMask,
      false,
    );
    if (!profile || isGeneralDescNumberType(countryIndex, profile.numberTypeIndex)) return;

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
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  terminalStateCount: number,
  isAlive: boolean,
): NumberTypeProfileRef | null {
  const terminalProfile = resolveUniqueConcreteProfileInTerminalStates(snapshot, digitsLength, terminalStateCount);
  if (terminalProfile !== null) return terminalProfile;

  if (!isAlive) return null;

  return resolveUniqueConcreteProfileInCurrentState(snapshot, state, digitsLength);
}

// Strict mode checks only the preferred country: exact, current partial, then terminal partial.
function resolveStrictPreferredMatch(
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
      snapshot,
      digitsLength,
      terminalStateCount,
      preferredCountryIndex,
    );
    if (isConcreteProfile(profile)) return profile;
    if (profile !== null) generalProfile = profile;
  }

  if (isAlive) {
    const profile = resolveCountryInCurrentState(snapshot, state, digitsLength, preferredCountryIndex);
    if (isConcreteProfile(profile)) return profile;
    if (profile !== null && generalProfile === null) generalProfile = profile;
  }

  if (hasTerminals) {
    const profile = resolveCountryInTerminalStates(snapshot, digitsLength, terminalStateCount, preferredCountryIndex);
    if (isConcreteProfile(profile)) return profile;
    if (profile !== null && generalProfile === null) generalProfile = profile;
  }

  return generalProfile;
}

// Step 1: an anchored concrete exact match always wins before any partial candidate is considered.
function resolveAnchoredConcreteExactMatch(
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  anchoredCountryIndex: number,
): NumberTypeProfileRef | null {
  if (anchoredCountryIndex === -1) return null;

  const profile = resolveCountryExactInTerminalStates(snapshot, digitsLength, terminalStateCount, anchoredCountryIndex);

  return profile !== null && !isGeneralDescProfile(profile) ? profile : null;
}


// Step 3: preferred concrete partial matches outrank anchored partial matches.
function resolvePreferredConcretePartialMatch(
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
    const profile = resolveCountryInCurrentState(snapshot, state, digitsLength, preferredCountryIndex);
    if (isConcreteProfile(profile)) return profile;
  }

  if (hasTerminals) {
    const profile = resolveCountryInTerminalStates(snapshot, digitsLength, terminalStateCount, preferredCountryIndex);
    if (isConcreteProfile(profile)) return profile;
  }

  return null;
}

// Step 4: anchored partial keeps its country before generic fallback candidates.
function resolveAnchoredPartialChain(
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
    const profile = resolveCountryInCurrentState(snapshot, state, digitsLength, anchoredCountryIndex);
    if (isConcreteProfile(profile)) return profile;
    if (profile !== null) generalProfile = profile;
  }

  if (hasTerminals) {
    const profile = resolveCountryInTerminalStates(snapshot, digitsLength, terminalStateCount, anchoredCountryIndex);
    if (isConcreteProfile(profile)) return profile;
    if (profile !== null && generalProfile === null) generalProfile = profile;
  }

  return generalProfile;
}

// Step 5: if preferred and anchored country do not resolve, use any concrete non-preferred partial match.
function resolveFallbackConcretePartialMatch(
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
  isAlive: boolean,
  hasTerminals: boolean,
): NumberTypeProfileRef | null {
  if (isAlive) {
    const profile = resolveFallbackInCurrentState(snapshot, state, digitsLength, preferredCountryIndex);
    if (isConcreteProfile(profile)) return profile;
  }

  if (hasTerminals) {
    const profile = resolveFallbackInTerminalStates(snapshot, digitsLength, terminalStateCount, preferredCountryIndex);
    if (isConcreteProfile(profile)) return profile;
  }

  return null;
}

// Step 6: returns the first generalDesc in chain order (preferred current -> preferred terminal -> other current -> other terminal).
function resolveGeneralDescPartialFallback(
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
      const profile = resolveCountryInCurrentState(snapshot, state, digitsLength, preferredCountryIndex);
      if (isConcreteProfile(profile)) return profile;
      if (profile !== null) generalProfile = profile;
    }

    if (hasTerminals) {
      const profile = resolveCountryInTerminalStates(snapshot, digitsLength, terminalStateCount, preferredCountryIndex);
      if (isConcreteProfile(profile)) return profile;
      if (profile !== null && generalProfile === null) generalProfile = profile;
    }
  }

  if (isAlive) {
    const profile = resolveFallbackInCurrentState(snapshot, state, digitsLength, preferredCountryIndex);
    if (isConcreteProfile(profile)) return profile;
    if (profile !== null && generalProfile === null) generalProfile = profile;
  }

  if (hasTerminals) {
    const profile = resolveFallbackInTerminalStates(snapshot, digitsLength, terminalStateCount, preferredCountryIndex);
    if (isConcreteProfile(profile)) return profile;
    if (profile !== null && generalProfile === null) generalProfile = profile;
  }

  return generalProfile;
}

export function resolveLatestConcreteCountryIndex(
  snapshot: NumberResolverSnapshot,
  nationalStates: readonly number[],
  terminalStateEnds: readonly number[],
): number {
  if (snapshot.nationalDigits.length === 0) return -1;

  const resourceProvider = getResourceProvider();
  const deadStateId = resourceProvider.graphLayer.deadStateId;
  const finalDigitsLength = snapshot.nationalDigits.length;
  let latestCountryIndex = -1;

  for (let i = 0; i < snapshot.nationalDigits.length; i++) {
    const state = nationalStates[i]!;
    const profile = resolveAnchorProfileAtPosition(
      snapshot,
      state,
      i + 1,
      terminalStateEnds[i]!,
      state !== deadStateId,
    );

    if (profile === null) continue;
    if (!canProfileReachLength(profile, finalDigitsLength)) continue;

    latestCountryIndex = getCountryIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);
  }

  return latestCountryIndex;
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
      snapshot,
      digitsLength,
      terminalStateCount,
      anchoredCountryIndex,
    );
    if (anchoredExact !== null) return anchoredExact;

    // Step 2: among exact matches, use the deterministic preferred-then-fallback order.
    const anyExact = resolveExactInTerminalStates(snapshot, digitsLength, terminalStateCount, preferredCountryIndex);
    if (anyExact !== null) return anyExact;
  }

  // Preferred concrete partial wins while the number is still incomplete.
  const preferredConcrete = resolvePreferredConcretePartialMatch(
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
    snapshot,
    state,
    digitsLength,
    terminalStateCount,
    preferredCountryIndex,
    isAlive,
    hasTerminals,
  );
}
