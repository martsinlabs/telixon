import {
  containsLength,
  getMaxLength,
  getStripFirstDigitMask,
  NationalPrefixRules,
  normalizeNationalNumber,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getAllowedLengthMask } from '../number-resolver/utils/get-allowed-length-mask';
import { getAllowedLocalOnlyLengthMask } from '../number-resolver/utils/get-allowed-local-only-length-mask';
import { getNationalPrefixRules } from '../number-resolver/utils/get-national-prefix-rules';
import { isGeneralDescExactMatch } from '../number-resolver/utils/resolve-exact-matched-types';
import { walkEndState } from '../number-resolver/utils/walk-end-state';

// libphonenumber parseHelper adopts the stripped number only when its length verdict is IS_POSSIBLE or TOO_LONG; a short/local-only result keeps the prefix.
function strippedLengthAcceptable(countryIndex: number, length: number): boolean {
  const nationalMask: number = getAllowedLengthMask(countryIndex, null, null);
  const localOnlyMask: number = getAllowedLocalOnlyLengthMask(countryIndex, null, null) & ~nationalMask;
  if (containsLength(localOnlyMask, length)) return false;
  if (nationalMask === 0) return false;
  return containsLength(nationalMask, length) || length > getMaxLength(nationalMask);
}

// libphonenumber maybeStripNationalPrefixAndCarrierCode plus the parseHelper length guard: returns the digits to re-walk, or null when the original number stands.
export function applyNationalPrefixStrip(
  nationalDigits: string,
  originalEndState: number,
  callingCodeState: number,
  countryIndex: number,
): string | null {
  if (countryIndex < 0 || nationalDigits.length === 0) return null;

  const { engine } = getResourceProvider();

  // Quick reject: the first digit cannot start this territory's nationalPrefixForParsing.
  const leadMask: number = getStripFirstDigitMask(engine, countryIndex);
  if (((leadMask >>> (nationalDigits.charCodeAt(0) - 48)) & 1) === 0) return null;

  const prefixRules: NationalPrefixRules | undefined = getNationalPrefixRules(countryIndex);
  if (!prefixRules) return null;

  const candidate: string = normalizeNationalNumber(nationalDigits, prefixRules).normalizedDigits;
  if (candidate === nationalDigits) return null;

  // Viability rule: keep the original when it matches the general desc entirely and the candidate does not.
  if (isGeneralDescExactMatch(originalEndState, nationalDigits.length, countryIndex)) {
    const candidateEndState: number = walkEndState(engine, callingCodeState, candidate);
    if (!isGeneralDescExactMatch(candidateEndState, candidate.length, countryIndex)) return null;
  }

  if (!strippedLengthAcceptable(countryIndex, candidate.length)) return null;

  return candidate;
}
