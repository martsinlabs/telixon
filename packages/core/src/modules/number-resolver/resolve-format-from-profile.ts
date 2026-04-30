import {
  forEachFormatIndex,
  getCountryIndex,
  getFormatMask,
  PhoneNumberFormat,
  PhoneNumberFormatList,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { NumberFormatRef, NumberTypeProfileRef } from './models';

/**
 * @internal
 * Finds the first format in the profile whose length range covers `digitsLength`.
 */
export function resolveFormatFromProfile(
  profileRef: NumberTypeProfileRef,
  digitsLength: number,
): NumberFormatRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(
    getCountryIndex(resourceProvider.countryScopeLayer, profileRef.stateCountryIndex),
  );
  const formatsList: PhoneNumberFormatList = resourceProvider.formatsTable[callingCodeIndex]!;
  const formatMask: number = getFormatMask(resourceProvider.numberTypeProfileLayer, profileRef.numberTypeProfileId);

  let resolvedFormat: NumberFormatRef | null = null;

  forEachFormatIndex(formatMask, (formatIndex: number) => {
    const format: PhoneNumberFormat = formatsList[formatIndex]!;

    if (digitsLength > format.lengthRange[1]) return;

    resolvedFormat = { ...profileRef, formatIndex };

    return true;
  });

  return resolvedFormat;
}
