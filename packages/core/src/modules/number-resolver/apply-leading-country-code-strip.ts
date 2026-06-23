import { containsLength, getMaxLength } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { stripNationalPrefix } from './apply-national-prefix-strip';
import { getAllowedLengthMask } from './utils/get-allowed-length-mask';
import { isGeneralDescExactMatch } from './utils/resolve-exact-matched-types';
import { walkEndState } from './utils/walk-end-state';

// libphonenumber maybeExtractCountryCode (FROM_NUMBER_WITHOUT_PLUS_SIGN): national digits that redundantly
// begin with the country's own calling code. Strip it when the remainder parses better (matches the
// country pattern where the full number did not, or the full number is too long); else null.
export function applyLeadingCountryCodeStrip(
  nationalDigits: string,
  callingCodeState: number,
  callingCode: string,
  countryIndex: number,
): string | null {
  if (countryIndex < 0 || callingCode.length === 0) return null;
  if (!nationalDigits.startsWith(callingCode) || nationalDigits.length === callingCode.length) return null;

  const { engine } = getResourceProvider();
  const afterCode: string = nationalDigits.slice(callingCode.length);

  // The remainder libphonenumber adopts is the one with its national prefix stripped (no length guard).
  const strippedRemainder: string | null = stripNationalPrefix(
    afterCode,
    walkEndState(engine, callingCodeState, afterCode),
    callingCodeState,
    countryIndex,
  );
  const remainder: string = strippedRemainder ?? afterCode;

  const fullMatches: boolean = isGeneralDescExactMatch(
    walkEndState(engine, callingCodeState, nationalDigits),
    nationalDigits.length,
    countryIndex,
  );
  const remainderMatches: boolean = isGeneralDescExactMatch(
    walkEndState(engine, callingCodeState, remainder),
    remainder.length,
    countryIndex,
  );

  const nationalMask: number = getAllowedLengthMask(countryIndex, null, null);
  const fullTooLong: boolean =
    nationalMask !== 0 &&
    !containsLength(nationalMask, nationalDigits.length) &&
    nationalDigits.length > getMaxLength(nationalMask);

  if ((!fullMatches && remainderMatches) || fullTooLong) return remainder;
  return null;
}
