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
import { matchesLeadingDigits } from './utils/matches-leading-digits';

/**
 * @internal
 * Selects the profile's format for `nationalDigits`: the first length-feasible format whose
 * leadingDigits match the digits typed so far, falling back to the first length-feasible format.
 */
export function resolveFormatFromProfile(
  profileRef: NumberTypeProfileRef,
  nationalDigits: string,
): NumberFormatRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(
    getCountryIndex(resourceProvider.countryScopeLayer, profileRef.stateCountryIndex),
  );
  const formatsList: PhoneNumberFormatList = resourceProvider.formatsTable[callingCodeIndex]!;
  const formatMask: number = getFormatMask(resourceProvider.numberTypeProfileLayer, profileRef.numberTypeProfileId);
  const digitsLength: number = nationalDigits.length;

  let leadingMatch: NumberFormatRef | null = null;
  let lengthFallback: NumberFormatRef | null = null;

  forEachFormatIndex(formatMask, (formatIndex: number) => {
    const format: PhoneNumberFormat = formatsList[formatIndex]!;

    if (digitsLength === 0 || digitsLength > format.lengthRange[1]) return;

    if (!lengthFallback) lengthFallback = { ...profileRef, formatIndex };

    if (matchesLeadingDigits(format.leadingDigits, nationalDigits)) {
      leadingMatch = { ...profileRef, formatIndex };
      return true;
    }
  });

  return leadingMatch ?? lengthFallback;
}
