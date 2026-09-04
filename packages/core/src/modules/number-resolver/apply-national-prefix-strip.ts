import {
  containsLength,
  getMaxLength,
  getRegionStripFirstDigitMask,
  NationalPrefixRules,
  normalizeNationalNumber,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getAllowedLengthMask } from './utils/get-allowed-length-mask';
import { getAllowedLocalOnlyLengthMask } from './utils/get-allowed-local-only-length-mask';
import { getNationalPrefixRules } from './utils/get-national-prefix-rules';
import { isGeneralDescExactMatch } from './utils/resolve-exact-matched-types';
import { walkEndState } from './utils/walk-end-state';

// libphonenumber parseHelper adopts the stripped number only when its length verdict is IS_POSSIBLE or TOO_LONG; a short/local-only result keeps the prefix.
function strippedLengthAcceptable(regionIndex: number, length: number): boolean {
  const nationalMask: number = getAllowedLengthMask(regionIndex, null, null);
  const localOnlyMask: number = getAllowedLocalOnlyLengthMask(regionIndex, null, null) & ~nationalMask;
  if (containsLength(localOnlyMask, length)) return false;
  if (nationalMask === 0) return false;
  return containsLength(nationalMask, length) || length > getMaxLength(nationalMask);
}

// libphonenumber maybeStripNationalPrefixAndCarrierCode: strip the national prefix, keeping the original only when it matches the general desc and the stripped form does not. No length guard.
export function stripNationalPrefix(
  nationalDigits: string,
  originalEndState: number,
  callingCodeState: number,
  regionIndex: number,
): string | null {
  if (regionIndex < 0 || nationalDigits.length === 0) return null;

  const { engine } = getResourceProvider();

  // Quick reject: the first digit cannot start this territory's nationalPrefixForParsing.
  const leadMask: number = getRegionStripFirstDigitMask(engine, regionIndex);
  if (((leadMask >>> (nationalDigits.charCodeAt(0) - 48)) & 1) === 0) return null;

  const prefixRules: NationalPrefixRules | undefined = getNationalPrefixRules(regionIndex);
  if (!prefixRules) return null;

  const candidate: string = normalizeNationalNumber(nationalDigits, prefixRules).normalizedDigits;
  if (candidate === nationalDigits) return null;

  // Viability rule: keep the original when it matches the general desc entirely and the candidate does not.
  if (isGeneralDescExactMatch(originalEndState, nationalDigits.length, regionIndex)) {
    const candidateEndState: number = walkEndState(engine, callingCodeState, candidate);
    if (!isGeneralDescExactMatch(candidateEndState, candidate.length, regionIndex)) return null;
  }

  return candidate;
}

// The strip above plus the parseHelper length guard: returns the digits to re-walk, or null when the original number stands.
export function applyNationalPrefixStrip(
  nationalDigits: string,
  originalEndState: number,
  callingCodeState: number,
  regionIndex: number,
): string | null {
  const candidate: string | null = stripNationalPrefix(nationalDigits, originalEndState, callingCodeState, regionIndex);
  if (candidate === null) return null;
  if (!strippedLengthAcceptable(regionIndex, candidate.length)) return null;
  return candidate;
}
