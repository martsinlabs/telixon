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
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { NumberResolverSnapshot, NumberTypeProfileRef } from './models';
import { isNumberTypeAllowed } from './utils/is-number-type-allowed';

function isGeneralDescNumberType(countryIndex: number, numberTypeIndex: number): boolean {
  const resourceProvider: ResourceProvider = getResourceProvider();
  const generalDescTypeId: number = resourceProvider.refMapping.numberTypes.length - 1;
  return resourceProvider.territorySpecTable[countryIndex]!.numberTypes[numberTypeIndex]!.type === generalDescTypeId;
}

function isGeneralDescProfile(profile: NumberTypeProfileRef): boolean {
  const resourceProvider: ResourceProvider = getResourceProvider();
  const countryIndex: number = getCountryIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);
  return isGeneralDescNumberType(countryIndex, profile.numberTypeIndex);
}

function isCountryExcluded(snapshot: NumberResolverSnapshot, countryIndex: number): boolean {
  return snapshot.countryFilter != null && snapshot.countryFilter[countryIndex] === 0;
}

function resolveProfile(
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  stateCountryIndex: number,
  countryIndex: number,
  getMask: (layer: NumberTypeScopeLayer, stateCountryIndex: number) => number,
  isCompleted: boolean,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();
  const numberTypeMask = getMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);
  let resolved: NumberTypeProfileRef | null = null;

  forEachNumberTypeIndex(numberTypeMask, (numberTypeIndex) => {
    if (snapshot.numberTypeFilter && !isNumberTypeAllowed(snapshot.numberTypeFilter, countryIndex, numberTypeIndex)) {
      return;
    }

    const numberTypeProfileId = getNumberTypeProfileId(
      resourceProvider.numberTypeProfileLayer,
      stateCountryIndex,
      numberTypeMask,
      numberTypeIndex,
    );

    const lengthMask: number = getLengthMask(resourceProvider.numberTypeProfileLayer, numberTypeProfileId);

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

// Iterates candidates in priority order. Returns the first concrete (non-generalDesc) profile,
// or the first generalDesc profile encountered as a last resort.
function resolveFirstConcrete(
  candidates: Array<() => NumberTypeProfileRef | null>,
): NumberTypeProfileRef | null {
  let generalFallback: NumberTypeProfileRef | null = null;

  for (const resolve of candidates) {
    const profile = resolve();
    if (!profile) continue;
    if (!isGeneralDescProfile(profile)) return profile;
    if (!generalFallback) generalFallback = profile;
  }

  return generalFallback;
}

function resolvePreferredInState(
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();
  let resolved: NumberTypeProfileRef | null = null;

  forEachStateCountry(resourceProvider.countryScopeLayer, state, (stateCountryIndex, countryIndex) => {
    if (isCountryExcluded(snapshot, countryIndex) || countryIndex !== preferredCountryIndex) return;
    resolved = resolveProfile(snapshot, digitsLength, stateCountryIndex, countryIndex, getNumberTypeMask, false);
    return true;
  });

  return resolved;
}

function resolvePreferredInTerminalStates(
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();
  let generalProfile: NumberTypeProfileRef | null = null;

  for (let i = terminalStateCount - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;
    let resolved: NumberTypeProfileRef | null = null;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex) || countryIndex !== preferredCountryIndex) return;

        const profile = resolveProfile(snapshot, digitsLength, stateCountryIndex, countryIndex, getTerminalPrefixNumberTypeMask, false);
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

function resolveCompletedTerminalNumberTypeProfile(
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();
  let generalProfile: NumberTypeProfileRef | null = null;

  for (let i = terminalStateCount - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;
    let preferredProfile: NumberTypeProfileRef | null = null;
    let fallbackProfile: NumberTypeProfileRef | null = null;
    let preferredGeneralProfile: NumberTypeProfileRef | null = null;
    let fallbackGeneralProfile: NumberTypeProfileRef | null = null;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex)) return;

        const isPreferred = preferredCountryIndex !== -1 && countryIndex === preferredCountryIndex;
        const profile = resolveProfile(snapshot, digitsLength, stateCountryIndex, countryIndex, getTerminalPrefixNumberTypeMask, true);
        if (!profile) return;

        if (isGeneralDescNumberType(countryIndex, profile.numberTypeIndex)) {
          if (isPreferred && !preferredGeneralProfile) preferredGeneralProfile = profile;
          else if (!isPreferred && !fallbackGeneralProfile) fallbackGeneralProfile = profile;
          return;
        }

        if (isPreferred) {
          preferredProfile = profile;
        } else {
          fallbackProfile = profile;
        }

        return true;
      },
    );

    const resolved = preferredProfile ?? fallbackProfile;
    if (resolved) return resolved;
    if (!generalProfile) generalProfile = preferredGeneralProfile ?? fallbackGeneralProfile;
  }

  return generalProfile;
}

function resolveFallbackInState(
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();
  let resolved: NumberTypeProfileRef | null = null;
  let generalProfile: NumberTypeProfileRef | null = null;

  forEachStateCountry(resourceProvider.countryScopeLayer, state, (stateCountryIndex, countryIndex) => {
    if (isCountryExcluded(snapshot, countryIndex) || countryIndex === preferredCountryIndex) return;

    const profile = resolveProfile(snapshot, digitsLength, stateCountryIndex, countryIndex, getNumberTypeMask, false);
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

function resolveFallbackInTerminalStates(
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();
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

        const profile = resolveProfile(snapshot, digitsLength, stateCountryIndex, countryIndex, getTerminalPrefixNumberTypeMask, false);
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

function resolveFirstConcreteNumberTypeProfile(
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  terminalStateCount: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();
  const isAlive = state !== resourceProvider.graphLayer.deadStateId;
  const hasTerminals = terminalStateCount > 0;

  const steps: Array<() => NumberTypeProfileRef | null> = [];

  if (hasTerminals)            steps.push(() => resolveCompletedTerminalNumberTypeProfile(snapshot, digitsLength, terminalStateCount, preferredCountryIndex));

  if (preferredCountryIndex !== -1) {
    if (isAlive)               steps.push(() => resolvePreferredInState(snapshot, state, digitsLength, preferredCountryIndex));
    if (hasTerminals)          steps.push(() => resolvePreferredInTerminalStates(snapshot, digitsLength, terminalStateCount, preferredCountryIndex));
  }

  if (isAlive)                 steps.push(() => resolveFallbackInState(snapshot, state, digitsLength, preferredCountryIndex));
  if (hasTerminals)            steps.push(() => resolveFallbackInTerminalStates(snapshot, digitsLength, terminalStateCount, preferredCountryIndex));

  return resolveFirstConcrete(steps);
}

export function resolveLatestConcreteCountryIndex(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
  nationalStates: readonly number[],
  terminalStateEnds: readonly number[],
): number {
  if (snapshot.nationalDigits.length === 0) return -1;

  const resourceProvider: ResourceProvider = getResourceProvider();
  let latestCountryIndex = -1;

  for (let i = 0; i < snapshot.nationalDigits.length; i++) {
    const profile: NumberTypeProfileRef | null = resolveFirstConcreteNumberTypeProfile(
      snapshot,
      nationalStates[i]!,
      i + 1,
      terminalStateEnds[i]!,
      preferredCountryIndex,
    );

    if (profile === null) continue;
    latestCountryIndex = getCountryIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);
  }

  return latestCountryIndex;
}

/**
 * @internal
 * Resolves the first matching number type profile for the given snapshot.
 * Pass `preferredCountryIndex` as `-1` if no country preference is needed.
 *
 * Priority order:
 *   1. Anchored country in current state
 *   2. Anchored country in terminal states
 *   3. Completed terminal states (preferred country first, then any)
 *   4. Preferred country in current state
 *   5. Preferred country in terminal states
 *   6. Any country (fallback) in current state
 *   7. Any country (fallback) in terminal states
 *   8. GeneralDesc profile as last resort
 */
export function resolveFirstMatchingNumberTypeProfile(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
  anchoredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();
  const state = snapshot.state;
  const digitsLength = snapshot.nationalDigits.length;
  const terminalStateCount = snapshot.terminalStates.length;
  const isAlive = state !== resourceProvider.graphLayer.deadStateId;
  const hasTerminals = terminalStateCount > 0;

  // Anchored country is returned as-is (including generalDesc) — caller locked the country explicitly.
  if (anchoredCountryIndex !== -1) {
    if (isAlive) {
      const profile = resolvePreferredInState(snapshot, state, digitsLength, anchoredCountryIndex);
      if (profile) return profile;
    }
    if (hasTerminals) {
      const profile = resolvePreferredInTerminalStates(snapshot, digitsLength, terminalStateCount, anchoredCountryIndex);
      if (profile) return profile;
    }
  }

  const steps: Array<() => NumberTypeProfileRef | null> = [];

  if (hasTerminals)            steps.push(() => resolveCompletedTerminalNumberTypeProfile(snapshot, digitsLength, terminalStateCount, preferredCountryIndex));

  if (preferredCountryIndex !== -1) {
    if (isAlive)               steps.push(() => resolvePreferredInState(snapshot, state, digitsLength, preferredCountryIndex));
    if (hasTerminals)          steps.push(() => resolvePreferredInTerminalStates(snapshot, digitsLength, terminalStateCount, preferredCountryIndex));
  }

  if (isAlive)                 steps.push(() => resolveFallbackInState(snapshot, state, digitsLength, preferredCountryIndex));
  if (hasTerminals)            steps.push(() => resolveFallbackInTerminalStates(snapshot, digitsLength, terminalStateCount, preferredCountryIndex));

  return resolveFirstConcrete(steps);
}
