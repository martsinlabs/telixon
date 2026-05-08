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

  let resolvedProfile: NumberTypeProfileRef | null = null;

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

    resolvedProfile = { stateCountryIndex, numberTypeIndex, numberTypeProfileId };

    return true;
  });

  return resolvedProfile;
}

function resolveInCountry(
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  stateCountryIndex: number,
  countryIndex: number,
  getMask: (layer: NumberTypeScopeLayer, stateCountryIndex: number) => number,
  isCompleted: boolean,
  generalProfile: NumberTypeProfileRef | null,
): { profile: NumberTypeProfileRef | null; generalProfile: NumberTypeProfileRef | null } {
  const profile: NumberTypeProfileRef | null = resolveProfile(
    snapshot,
    digitsLength,
    stateCountryIndex,
    countryIndex,
    getMask,
    isCompleted,
  );

  if (profile === null) {
    return { profile: null, generalProfile };
  }

  if (isGeneralDescNumberType(countryIndex, profile.numberTypeIndex)) {
    return { profile: null, generalProfile: generalProfile ?? profile };
  }

  return { profile, generalProfile };
}

function isCountryExcluded(snapshot: NumberResolverSnapshot, countryIndex: number): boolean {
  return snapshot.countryFilter != null && snapshot.countryFilter[countryIndex] === 0;
}

function resolveNumberTypeProfileForCountry(
  snapshot: NumberResolverSnapshot,
  digitsLength: number,
  stateCountryIndex: number,
  countryIndex: number,
  getMask: (layer: NumberTypeScopeLayer, stateCountryIndex: number) => number,
): NumberTypeProfileRef | null {
  return resolveProfile(snapshot, digitsLength, stateCountryIndex, countryIndex, getMask, false);
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
    let preferredGeneralProfile: NumberTypeProfileRef | null = null;
    let fallbackProfile: NumberTypeProfileRef | null = null;
    let fallbackGeneralProfile: NumberTypeProfileRef | null = null;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex)) return;

        if (preferredCountryIndex !== -1 && countryIndex === preferredCountryIndex) {
          const resolved = resolveInCountry(
            snapshot,
            digitsLength,
            stateCountryIndex,
            countryIndex,
            getTerminalPrefixNumberTypeMask,
            true,
            preferredGeneralProfile,
          );

          preferredGeneralProfile = resolved.generalProfile;
          preferredProfile = resolved.profile;
          if (preferredProfile === null) return;
          return true; // resolved → stop early
        }

        const resolved = resolveInCountry(
          snapshot,
          digitsLength,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
          true,
          fallbackGeneralProfile,
        );

        fallbackGeneralProfile = resolved.generalProfile;
        fallbackProfile = resolved.profile;
        if (fallbackProfile === null) return;
        return true;
      },
    );

    const resolved = preferredProfile ?? fallbackProfile;
    if (resolved) return resolved;

    if (generalProfile === null) {
      generalProfile = preferredGeneralProfile ?? fallbackGeneralProfile;
    }
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
  const isAlive: boolean = state !== resourceProvider.graphLayer.deadStateId;
  const hasTerminalStates: boolean = terminalStateCount > 0;

  if (hasTerminalStates) {
    const profile: NumberTypeProfileRef | null = resolveCompletedTerminalNumberTypeProfile(
      snapshot,
      digitsLength,
      terminalStateCount,
      preferredCountryIndex,
    );
    if (profile !== null && !isGeneralDescProfile(profile)) return profile;
  }

  if (preferredCountryIndex !== -1) {
    if (isAlive) {
      const profile: NumberTypeProfileRef | null = resolvePreferredInState(
        snapshot,
        state,
        digitsLength,
        preferredCountryIndex,
      );
      if (profile !== null && !isGeneralDescProfile(profile)) return profile;
    }

    if (hasTerminalStates) {
      const profile: NumberTypeProfileRef | null = resolvePreferredInTerminalStates(
        snapshot,
        digitsLength,
        terminalStateCount,
        preferredCountryIndex,
      );
      if (profile !== null && !isGeneralDescProfile(profile)) return profile;
    }
  }

  if (isAlive) {
    const profile: NumberTypeProfileRef | null = resolveFallbackInState(
      snapshot,
      state,
      digitsLength,
      preferredCountryIndex,
    );
    if (profile !== null && !isGeneralDescProfile(profile)) return profile;
  }

  if (hasTerminalStates) {
    const profile: NumberTypeProfileRef | null = resolveFallbackInTerminalStates(
      snapshot,
      digitsLength,
      terminalStateCount,
      preferredCountryIndex,
    );
    if (profile !== null && !isGeneralDescProfile(profile)) return profile;
  }

  return null;
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

function resolvePreferredInState(
  snapshot: NumberResolverSnapshot,
  state: number,
  digitsLength: number,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  let resolvedProfile: NumberTypeProfileRef | null = null;

  forEachStateCountry(resourceProvider.countryScopeLayer, state, (stateCountryIndex, countryIndex) => {
    if (isCountryExcluded(snapshot, countryIndex) || countryIndex !== preferredCountryIndex) return;

    resolvedProfile = resolveNumberTypeProfileForCountry(
      snapshot,
      digitsLength,
      stateCountryIndex,
      countryIndex,
      getNumberTypeMask,
    );

    return true;
  });

  return resolvedProfile;
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

    let resolvedProfile: NumberTypeProfileRef | null = null;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex) || countryIndex !== preferredCountryIndex) return;

        const resolved = resolveInCountry(
          snapshot,
          digitsLength,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
          false,
          generalProfile,
        );

        generalProfile = resolved.generalProfile;
        resolvedProfile = resolved.profile;

        if (resolvedProfile === null) return;

        return true;
      },
    );

    if (resolvedProfile) return resolvedProfile;
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

  let resolvedProfile: NumberTypeProfileRef | null = null;
  let generalProfile: NumberTypeProfileRef | null = null;

  forEachStateCountry(resourceProvider.countryScopeLayer, state, (stateCountryIndex, countryIndex) => {
    if (isCountryExcluded(snapshot, countryIndex) || countryIndex === preferredCountryIndex) return;

    const resolved = resolveInCountry(
      snapshot,
      digitsLength,
      stateCountryIndex,
      countryIndex,
      getNumberTypeMask,
      false,
      generalProfile,
    );

    generalProfile = resolved.generalProfile;
    resolvedProfile = resolved.profile;

    if (resolvedProfile === null) return;

    if (resolvedProfile) return true;
  });

  return resolvedProfile ?? generalProfile;
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

    let resolvedProfile: NumberTypeProfileRef | null = null;
    let terminalGeneralProfile: NumberTypeProfileRef | null = null;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex) || countryIndex === preferredCountryIndex) return;

        const resolved = resolveInCountry(
          snapshot,
          digitsLength,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
          false,
          terminalGeneralProfile,
        );

        terminalGeneralProfile = resolved.generalProfile;
        resolvedProfile = resolved.profile;

        if (resolvedProfile === null) return;

        if (resolvedProfile) return true;
      },
    );

    if (resolvedProfile) return resolvedProfile;

    if (generalProfile === null) generalProfile = terminalGeneralProfile;
  }

  return generalProfile;
}

/**
 * @internal
 * Resolves the first matching number type profile for the given snapshot.
 * Pass `preferredCountryIndex` as `-1` if no country preference is needed.
 */
export function resolveFirstMatchingNumberTypeProfile(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
  anchoredCountryIndex: number,
): NumberTypeProfileRef | null {
  let generalProfile: NumberTypeProfileRef | null = null;
  const resourceProvider: ResourceProvider = getResourceProvider();
  const state: number = snapshot.state;
  const digitsLength: number = snapshot.nationalDigits.length;
  const terminalStateCount: number = snapshot.terminalStates.length;

  const isAlive: boolean = state !== resourceProvider.graphLayer.deadStateId;
  const hasTerminalStates: boolean = terminalStateCount > 0;

  if (anchoredCountryIndex !== -1) {
    if (isAlive) {
      const profile: NumberTypeProfileRef | null = resolvePreferredInState(
        snapshot,
        state,
        digitsLength,
        anchoredCountryIndex,
      );
      if (profile) return profile;
    }

    if (hasTerminalStates) {
      const profile: NumberTypeProfileRef | null = resolvePreferredInTerminalStates(
        snapshot,
        digitsLength,
        terminalStateCount,
        anchoredCountryIndex,
      );
      if (profile) return profile;
    }
  }

  if (hasTerminalStates) {
    const completedProfile = resolveCompletedTerminalNumberTypeProfile(
      snapshot,
      digitsLength,
      terminalStateCount,
      preferredCountryIndex,
    );

    if (completedProfile) {
      if (!isGeneralDescProfile(completedProfile)) return completedProfile;
      generalProfile = completedProfile;
    }
  }

  if (preferredCountryIndex !== -1) {
    if (isAlive) {
      const profile: NumberTypeProfileRef | null = resolvePreferredInState(
        snapshot,
        state,
        digitsLength,
        preferredCountryIndex,
      );

      if (profile) {
        if (!isGeneralDescProfile(profile)) return profile;
        if (generalProfile === null) generalProfile = profile;
      }
    }

    if (hasTerminalStates) {
      const profile: NumberTypeProfileRef | null = resolvePreferredInTerminalStates(
        snapshot,
        digitsLength,
        terminalStateCount,
        preferredCountryIndex,
      );

      if (profile) {
        if (!isGeneralDescProfile(profile)) return profile;
        if (generalProfile === null) generalProfile = profile;
      }
    }
  }

  if (isAlive) {
    const profile: NumberTypeProfileRef | null = resolveFallbackInState(
      snapshot,
      state,
      digitsLength,
      preferredCountryIndex,
    );

    if (profile) {
      if (!isGeneralDescProfile(profile)) return profile;
      if (generalProfile === null) generalProfile = profile;
    }
  }

  if (hasTerminalStates) {
    const profile: NumberTypeProfileRef | null = resolveFallbackInTerminalStates(
      snapshot,
      digitsLength,
      terminalStateCount,
      preferredCountryIndex,
    );

    if (profile) {
      if (!isGeneralDescProfile(profile)) return profile;
      if (generalProfile === null) generalProfile = profile;
    }
  }

  return generalProfile;
}
