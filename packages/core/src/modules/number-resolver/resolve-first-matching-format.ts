import {
  forEachFormatIndex,
  forEachNumberTypeIndex,
  forEachStateCountry,
  forEachStateCountryWithTerminalPrefix,
  getCountryIndex,
  getFormatMask,
  getNumberTypeMask,
  getNumberTypeProfileId,
  getTerminalPrefixNumberTypeMask,
  NumberTypeScopeLayer,
  PhoneNumberFormat,
  PhoneNumberFormatList,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { NumberFormatRef, NumberResolverSnapshot } from './models';

function getCallingCodeIndex(resourceProvider: ResourceProvider, countryIndex: number): number {
  const callingCode: number = +resourceProvider.territorySpecTable[countryIndex]!.countryCode;

  return resourceProvider.refMapping.callingCodes.keyToIndex[callingCode]!;
}

function resolveFormatForCountry(
  snapshot: NumberResolverSnapshot,
  stateCountryIndex: number,
  callingCodeIndex: number,
  getMask: (layer: NumberTypeScopeLayer, stateCountryIndex: number) => number,
): NumberFormatRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const numberTypeMask: number = getMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);

  const formatsList: PhoneNumberFormatList = resourceProvider.formatsTable[callingCodeIndex]!;

  const digitsLength: number = snapshot.nationalDigits.length;

  let resolvedFormat: NumberFormatRef | null = null;

  forEachNumberTypeIndex(numberTypeMask, (numberTypeIndex: number) => {
    const numberTypeProfileId: number = getNumberTypeProfileId(
      resourceProvider.numberTypeProfileLayer,
      stateCountryIndex,
      numberTypeMask,
      numberTypeIndex,
    );

    const formatMask: number = getFormatMask(resourceProvider.numberTypeProfileLayer, numberTypeProfileId);

    forEachFormatIndex(formatMask, (formatIndex: number) => {
      const format: PhoneNumberFormat = formatsList[formatIndex]!;

      if (digitsLength > format.lengthRange[1]) return;

      resolvedFormat = { stateCountryIndex, numberTypeIndex, numberTypeProfileId, formatIndex };

      return true;
    });

    if (resolvedFormat) return true;
  });

  return resolvedFormat;
}

function resolveNonTerminalFormat(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
): NumberFormatRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  let resolvedFormat: NumberFormatRef | null = null;

  if (preferredCountryIndex !== -1) {
    forEachStateCountry(
      resourceProvider.countryScopeLayer,
      snapshot.state,
      (stateCountryIndex: number, countryIndex: number) => {
        if (stateCountryIndex !== preferredCountryIndex) return;

        resolvedFormat = resolveFormatForCountry(
          snapshot,
          stateCountryIndex,
          getCallingCodeIndex(resourceProvider, countryIndex),
          getNumberTypeMask,
        );

        return true;
      },
    );

    if (resolvedFormat) return resolvedFormat;
  }

  forEachStateCountry(
    resourceProvider.countryScopeLayer,
    snapshot.state,
    (stateCountryIndex: number, countryIndex: number) => {
      if (stateCountryIndex === preferredCountryIndex) return;

      resolvedFormat = resolveFormatForCountry(
        snapshot,
        stateCountryIndex,
        getCallingCodeIndex(resourceProvider, countryIndex),
        getNumberTypeMask,
      );

      if (resolvedFormat) return true;
    },
  );

  return resolvedFormat;
}

function resolveTerminalFormat(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
): NumberFormatRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  let resolvedFormat: NumberFormatRef | null = null;

  if (preferredCountryIndex !== -1) {
    forEachStateCountryWithTerminalPrefix(
      resourceProvider.countryScopeLayer,
      snapshot.lastTerminalState,
      (stateCountryIndex: number, countryIndex: number) => {
        if (stateCountryIndex !== preferredCountryIndex) return;

        resolvedFormat = resolveFormatForCountry(
          snapshot,
          stateCountryIndex,
          getCallingCodeIndex(resourceProvider, countryIndex),
          getTerminalPrefixNumberTypeMask,
        );

        return true;
      },
    );

    if (resolvedFormat) return resolvedFormat;
  }

  forEachStateCountryWithTerminalPrefix(
    resourceProvider.countryScopeLayer,
    snapshot.lastTerminalState,
    (stateCountryIndex: number, countryIndex: number) => {
      if (stateCountryIndex === preferredCountryIndex) return;

      resolvedFormat = resolveFormatForCountry(
        snapshot,
        stateCountryIndex,
        getCallingCodeIndex(resourceProvider, countryIndex),
        getTerminalPrefixNumberTypeMask,
      );

      if (resolvedFormat) return true;
    },
  );

  return resolvedFormat;
}

/**
 * @internal
 * Resolves the first matching phone number format for the given snapshot.
 * Pass `preferredCountryIndex` as `-1` if no country preference is needed.
 */
export function resolveFirstMatchingFormat(
  snapshot: NumberResolverSnapshot,
  preferredCountryIndex: number,
): NumberFormatRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  if (snapshot.state !== resourceProvider.graphLayer.deadStateId) {
    return resolveNonTerminalFormat(snapshot, preferredCountryIndex);
  }

  if (snapshot.lastTerminalState !== resourceProvider.graphLayer.deadStateId) {
    return resolveTerminalFormat(snapshot, preferredCountryIndex);
  }

  return null;
}

/**
 * @internal
 * Assumes stateCountryIndex and formatIndex are valid indices.
 */
export function _getPhoneNumberFormat(stateCountryIndex: number, formatIndex: number): PhoneNumberFormat {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const countryIndex: number = getCountryIndex(resourceProvider.countryScopeLayer, stateCountryIndex);

  const callingCodeIndex: number = getCallingCodeIndex(resourceProvider, countryIndex);

  return resourceProvider.formatsTable[callingCodeIndex]![formatIndex]!;
}
