import {
  forEachLength,
  forEachNumberTypeIndex,
  forEachStateCountry,
  forEachStateCountryWithTerminalPrefix,
  getLengthMask,
  getNumberTypeMask,
  getNumberTypeProfileId,
  getTerminalPrefixNumberTypeMask,
  NumberTypeScopeLayer,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { NumberTypeProfileRef, NumberResolverSnapshot } from './models';
import { isNumberTypeAllowed } from './utils/is-number-type-allowed';

function resolveNumberTypeProfileForCountry(
  snapshot: NumberResolverSnapshot,
  stateCountryIndex: number,
  countryIndex: number,
  getMask: (layer: NumberTypeScopeLayer, stateCountryIndex: number) => number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const numberTypeMask: number = getMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);

  let resolvedProfile: NumberTypeProfileRef | null = null;

  forEachNumberTypeIndex(numberTypeMask, (numberTypeIndex: number) => {
    if (snapshot.numberTypeFilter && !isNumberTypeAllowed(snapshot.numberTypeFilter, countryIndex, numberTypeIndex))
      return;

    const numberTypeProfileId: number = getNumberTypeProfileId(
      resourceProvider.numberTypeProfileLayer,
      stateCountryIndex,
      numberTypeMask,
      numberTypeIndex,
    );

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

  const numberTypeMask: number = getTerminalPrefixNumberTypeMask(
    resourceProvider.numberTypeScopeLayer,
    stateCountryIndex,
  );

  const digitsLength: number = snapshot.nationalDigits.length;

  let resolvedProfile: NumberTypeProfileRef | null = null;

  forEachNumberTypeIndex(numberTypeMask, (numberTypeIndex: number) => {
    if (snapshot.numberTypeFilter && !isNumberTypeAllowed(snapshot.numberTypeFilter, countryIndex, numberTypeIndex))
      return;

    const numberTypeProfileId: number = getNumberTypeProfileId(
      resourceProvider.numberTypeProfileLayer,
      stateCountryIndex,
      numberTypeMask,
      numberTypeIndex,
    );

    const lengthMask: number = getLengthMask(resourceProvider.numberTypeProfileLayer, numberTypeProfileId);

    let isCompleted: boolean = false;
    forEachLength(lengthMask, (length: number) => {
      if (length === digitsLength) {
        isCompleted = true;
        return true;
      }
    });

    if (!isCompleted) return;

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
    const terminalState: number = snapshot.terminalStates[i]!;

    let resolvedProfile: NumberTypeProfileRef | null = null;

    if (preferredCountryIndex !== -1) {
      forEachStateCountryWithTerminalPrefix(
        resourceProvider.countryScopeLayer,
        terminalState,
        (stateCountryIndex: number, countryIndex: number) => {
          if (snapshot.countryFilter && snapshot.countryFilter[countryIndex] === 0) return;
          if (stateCountryIndex !== preferredCountryIndex) return;

          resolvedProfile = resolveCompletedNumberTypeProfileForCountry(snapshot, stateCountryIndex, countryIndex);

          return true;
        },
      );

      if (resolvedProfile) return resolvedProfile;
    }

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex: number, countryIndex: number) => {
        if (snapshot.countryFilter && snapshot.countryFilter[countryIndex] === 0) return;
        if (stateCountryIndex === preferredCountryIndex) return;

        resolvedProfile = resolveCompletedNumberTypeProfileForCountry(snapshot, stateCountryIndex, countryIndex);

        if (resolvedProfile) return true;
      },
    );

    if (resolvedProfile) return resolvedProfile;
  }

  return null;
}

function resolveNonTerminalNumberTypeProfile(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  let resolvedProfile: NumberTypeProfileRef | null = null;

  if (preferredCountryIndex !== -1) {
    forEachStateCountry(
      resourceProvider.countryScopeLayer,
      snapshot.state,
      (stateCountryIndex: number, countryIndex: number) => {
        if (snapshot.countryFilter && snapshot.countryFilter[countryIndex] === 0) return;
        if (stateCountryIndex !== preferredCountryIndex) return;

        resolvedProfile = resolveNumberTypeProfileForCountry(
          snapshot,
          stateCountryIndex,
          countryIndex,
          getNumberTypeMask,
        );

        return true;
      },
    );

    if (resolvedProfile) return resolvedProfile;
  }

  forEachStateCountry(
    resourceProvider.countryScopeLayer,
    snapshot.state,
    (stateCountryIndex: number, countryIndex: number) => {
      if (snapshot.countryFilter && snapshot.countryFilter[countryIndex] === 0) return;
      if (stateCountryIndex === preferredCountryIndex) return;

      resolvedProfile = resolveNumberTypeProfileForCountry(
        snapshot,
        stateCountryIndex,
        countryIndex,
        getNumberTypeMask,
      );

      if (resolvedProfile) return true;
    },
  );

  return resolvedProfile;
}

function resolveTerminalNumberTypeProfile(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
): NumberTypeProfileRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  for (let i = snapshot.terminalStates.length - 1; i >= 0; i--) {
    const terminalState: number = snapshot.terminalStates[i]!;

    let resolvedProfile: NumberTypeProfileRef | null = null;

    if (preferredCountryIndex !== -1) {
      forEachStateCountryWithTerminalPrefix(
        resourceProvider.countryScopeLayer,
        terminalState,
        (stateCountryIndex: number, countryIndex: number) => {
          if (snapshot.countryFilter && snapshot.countryFilter[countryIndex] === 0) return;
          if (stateCountryIndex !== preferredCountryIndex) return;

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

    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      terminalState,
      (stateCountryIndex: number, countryIndex: number) => {
        if (snapshot.countryFilter && snapshot.countryFilter[countryIndex] === 0) return;
        if (stateCountryIndex === preferredCountryIndex) return;

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

  const completedProfile: NumberTypeProfileRef | null = resolveCompletedTerminalNumberTypeProfile(
    snapshot,
    preferredCountryIndex,
  );

  if (completedProfile) return completedProfile;

  if (snapshot.state !== resourceProvider.graphLayer.deadStateId) {
    return resolveNonTerminalNumberTypeProfile(snapshot, preferredCountryIndex);
  }

  if (snapshot.terminalStates.length > 0) {
    return resolveTerminalNumberTypeProfile(snapshot, preferredCountryIndex);
  }

  return null;
}

