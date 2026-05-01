import {
  containsLength,
  forEachNumberTypeIndex,
  forEachStateCountry,
  forEachStateCountryWithTerminalPrefix,
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

function isCountryExcluded(snapshot: NumberResolverSnapshot, countryIndex: number): boolean {
  return snapshot.countryFilter != null && snapshot.countryFilter[countryIndex] === 0;
}

function resolveNumberTypeProfileForCountry(
  snapshot: NumberResolverSnapshot,
  stateCountryIndex: number,
  countryIndex: number,
  getMask: (layer: NumberTypeScopeLayer, stateCountryIndex: number) => number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();
  const numberTypeMask = getMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);
  const digitsLength = snapshot.nationalDigits.length;

  let resolvedProfile: NumberTypeProfileRef | null = null;

  forEachNumberTypeIndex(numberTypeMask, (numberTypeIndex) => {
    if (snapshot.numberTypeFilter && !isNumberTypeAllowed(snapshot.numberTypeFilter, countryIndex, numberTypeIndex))
      return;

    const numberTypeProfileId = getNumberTypeProfileId(
      resourceProvider.numberTypeProfileLayer,
      stateCountryIndex,
      numberTypeMask,
      numberTypeIndex,
    );

    if (digitsLength > getMaxLength(getLengthMask(resourceProvider.numberTypeProfileLayer, numberTypeProfileId)))
      return;

    resolvedProfile = { stateCountryIndex, numberTypeIndex, numberTypeProfileId };

    return true;
  });

  return resolvedProfile;
}

function resolveCompletedNumberTypeProfileForCountry(
  snapshot: NumberResolverSnapshot,
  stateCountryIndex: number,
  countryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();
  const numberTypeMask = getTerminalPrefixNumberTypeMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);
  const digitsLength = snapshot.nationalDigits.length;

  let resolvedProfile: NumberTypeProfileRef | null = null;

  forEachNumberTypeIndex(numberTypeMask, (numberTypeIndex) => {
    if (snapshot.numberTypeFilter && !isNumberTypeAllowed(snapshot.numberTypeFilter, countryIndex, numberTypeIndex))
      return;

    const numberTypeProfileId = getNumberTypeProfileId(
      resourceProvider.numberTypeProfileLayer,
      stateCountryIndex,
      numberTypeMask,
      numberTypeIndex,
    );

    if (!containsLength(getLengthMask(resourceProvider.numberTypeProfileLayer, numberTypeProfileId), digitsLength))
      return;

    resolvedProfile = { stateCountryIndex, numberTypeIndex, numberTypeProfileId };

    return true;
  });

  return resolvedProfile;
}

function resolveCompletedTerminalNumberTypeProfile(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  for (let i = snapshot.terminalStates.length - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;

    let preferredProfile: NumberTypeProfileRef | null = null;
    let fallbackProfile: NumberTypeProfileRef | null = null;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex)) return;

        if (preferredCountryIndex !== -1 && countryIndex === preferredCountryIndex) {
          preferredProfile = resolveCompletedNumberTypeProfileForCountry(snapshot, stateCountryIndex, countryIndex);
          if (preferredProfile !== null) return true; // resolved → stop early
          return; // not resolved → continue scanning for fallback
        }

        if (fallbackProfile === null) {
          fallbackProfile = resolveCompletedNumberTypeProfileForCountry(snapshot, stateCountryIndex, countryIndex);
          if (preferredCountryIndex === -1 && fallbackProfile !== null) return true; // no preference → stop
        }
      },
    );

    const resolved = preferredProfile ?? fallbackProfile;
    if (resolved) return resolved;
  }

  return null;
}

function resolvePreferredInState(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  let resolvedProfile: NumberTypeProfileRef | null = null;

  forEachStateCountry(resourceProvider.countryScopeLayer, snapshot.state, (stateCountryIndex, countryIndex) => {
    if (isCountryExcluded(snapshot, countryIndex)) return;
    if (countryIndex !== preferredCountryIndex) return;

    resolvedProfile = resolveNumberTypeProfileForCountry(snapshot, stateCountryIndex, countryIndex, getNumberTypeMask);

    return true;
  });

  return resolvedProfile;
}

function resolvePreferredInTerminalStates(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  for (let i = snapshot.terminalStates.length - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;

    let resolvedProfile: NumberTypeProfileRef | null = null;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex)) return;
        if (countryIndex !== preferredCountryIndex) return;

        resolvedProfile = resolveNumberTypeProfileForCountry(
          snapshot,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
        );

        return true;
      },
    );

    if (resolvedProfile) return resolvedProfile;
  }

  return null;
}

function resolveFallbackInState(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  let resolvedProfile: NumberTypeProfileRef | null = null;

  forEachStateCountry(resourceProvider.countryScopeLayer, snapshot.state, (stateCountryIndex, countryIndex) => {
    if (isCountryExcluded(snapshot, countryIndex)) return;
    if (countryIndex === preferredCountryIndex) return;

    resolvedProfile = resolveNumberTypeProfileForCountry(snapshot, stateCountryIndex, countryIndex, getNumberTypeMask);

    if (resolvedProfile) return true;
  });

  return resolvedProfile;
}

function resolveFallbackInTerminalStates(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  for (let i = snapshot.terminalStates.length - 1; i >= 0; i--) {
    const terminalState = snapshot.terminalStates[i]!;

    let resolvedProfile: NumberTypeProfileRef | null = null;

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex, countryIndex) => {
        if (isCountryExcluded(snapshot, countryIndex)) return;
        if (countryIndex === preferredCountryIndex) return;

        resolvedProfile = resolveNumberTypeProfileForCountry(
          snapshot,
          stateCountryIndex,
          countryIndex,
          getTerminalPrefixNumberTypeMask,
        );

        if (resolvedProfile) return true;
      },
    );

    if (resolvedProfile) return resolvedProfile;
  }

  return null;
}

/**
 * @internal
 * Resolves the first matching number type profile for the given snapshot.
 * Pass `preferredCountryIndex` as `-1` if no country preference is needed.
 */
export function resolveFirstMatchingNumberTypeProfile(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const isAlive: boolean = snapshot.state !== resourceProvider.graphLayer.deadStateId;
  const hasTerminalStates: boolean = snapshot.terminalStates.length > 0;

  if (hasTerminalStates) {
    const completedProfile = resolveCompletedTerminalNumberTypeProfile(snapshot, preferredCountryIndex);
    if (completedProfile) return completedProfile;
  }

  if (preferredCountryIndex !== -1) {
    if (isAlive) {
      const profile: NumberTypeProfileRef | null = resolvePreferredInState(snapshot, preferredCountryIndex);
      if (profile) return profile;
    }

    if (hasTerminalStates) {
      const profile: NumberTypeProfileRef | null = resolvePreferredInTerminalStates(snapshot, preferredCountryIndex);
      if (profile) return profile;
    }
  }

  if (isAlive) {
    const profile: NumberTypeProfileRef | null = resolveFallbackInState(snapshot, preferredCountryIndex);
    if (profile) return profile;
  }

  if (hasTerminalStates) {
    const profile: NumberTypeProfileRef | null = resolveFallbackInTerminalStates(snapshot, preferredCountryIndex);
    if (profile) return profile;
  }

  return null;
}
