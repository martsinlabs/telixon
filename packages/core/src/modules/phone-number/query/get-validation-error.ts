import { getFormatIndex, getMaxLength, getRegionNationalPrefix, isFormatPrefixOptional } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByRegionIndex } from '@telixon/core/utils/get-calling-code-index-by-region-index';
import { ResolvedNumberState, resolveNumber } from '../../number-resolver/resolve-number';
import {
  PossibilityLengthMasks,
  resolvePossibilityLengthMasks,
} from '../../number-resolver/utils/resolve-possibility-length-masks';
import { resolvePrimaryRegionIndex } from '../../number-resolver/utils/resolve-primary-region-index';
import { selectNationalFormatIndex } from '../../number-resolver/utils/select-national-format';
import { PossibilityResult, ResolvedPhoneNumber, ValidationError } from '../models';
import { toResolvedPhoneNumber } from '../to-resolved-phone-number';
import { getNumberType } from './get-number-type';
import { getMinLength, getPossibleLengths } from './length-utils';

/** Returns the highest-precedence validation error for the resolved number, or `null` when none apply. */
export function getValidationError(
  resolved: ResolvedPhoneNumber,
  reason: PossibilityResult,
  valid: boolean,
): ValidationError | null {
  const {
    nationalDigits,
    callingCode,
    callingCodeState,
    defaultRegionIndex,
    regionFilter,
    numberTypeFilter,
    nationalPrefixPresent,
    readAsNational,
    callingCodeSeeded,
  } = resolved;

  if (nationalDigits.length === 0 && callingCode.length === 0) return { kind: 'EMPTY' };

  if (reason === 'INVALID_CALLING_CODE') return { kind: 'INVALID_CALLING_CODE' };

  // Detect a typed national prefix before the length verdicts, which would misread the extra digits.
  if (callingCodeSeeded && !valid) {
    const nationalPrefixPresentError: ValidationError | null = detectNationalPrefixPresent(resolved);
    if (nationalPrefixPresentError !== null) return nationalPrefixPresentError;
  }

  const regionIndex: number = resolvePrimaryRegionIndex(callingCodeState, defaultRegionIndex);
  // The same masks the possibility check read, so the reported lengths always agree with the reason.
  const masks: PossibilityLengthMasks = resolvePossibilityLengthMasks(
    callingCodeState,
    defaultRegionIndex,
    regionFilter,
    numberTypeFilter,
  );
  const nationalMask: number = masks.national;

  if (reason === 'TOO_SHORT') return { kind: 'TOO_SHORT', minLength: getMinLength(nationalMask) };
  if (reason === 'TOO_LONG') return { kind: 'TOO_LONG', maxLength: getMaxLength(nationalMask) };
  if (reason === 'INVALID_LENGTH') return { kind: 'INVALID_LENGTH', possibleLengths: getPossibleLengths(nationalMask) };

  // Possible only for local dialing (e.g. a subscriber number without its area code): an incompleteness case, distinct from a pattern fault.
  if (reason === 'IS_POSSIBLE_LOCAL_ONLY') return { kind: 'POSSIBLE_LOCAL_ONLY' };

  if (!valid) return { kind: 'PATTERN_MISMATCH' };

  // International input legitimately omits the trunk prefix; only national-mode input can be missing it.
  if (readAsNational && !nationalPrefixPresent) {
    return detectNationalPrefixMissing(regionIndex, nationalDigits);
  }

  return null;
}

/** Returns `NATIONAL_PREFIX_MISSING` when the matching format requires the national prefix and the typed digits omit it; otherwise `null`. */
function detectNationalPrefixMissing(regionIndex: number, nationalDigits: string): ValidationError | null {
  const resourceProvider = getResourceProvider();
  if (regionIndex < 0) return null;

  const nationalPrefix: string | undefined = getRegionNationalPrefix(resourceProvider.engine, regionIndex);
  if (!nationalPrefix) return null;

  const callingCodeIndex: number = getCallingCodeIndexByRegionIndex(regionIndex);
  if (callingCodeIndex === -1) return null;

  const formatPosition: number = selectNationalFormatIndex(callingCodeIndex, nationalDigits, false);
  if (formatPosition < 0) return null;

  const formatIndex: number = getFormatIndex(resourceProvider.engine, callingCodeIndex, formatPosition);
  if (isFormatPrefixOptional(resourceProvider.engine, formatIndex)) return null;

  return { kind: 'NATIONAL_PREFIX_MISSING', expectedPrefix: nationalPrefix };
}

/** Returns `NATIONAL_PREFIX_PRESENT` when the parse-side read drops leading national-dialing digits and the remainder is a valid number; otherwise `null`. */
function detectNationalPrefixPresent(resolved: ResolvedPhoneNumber): ValidationError | null {
  const { nationalDigits, callingCode, defaultRegionIndex, regionFilter, numberTypeFilter, strict } = resolved;
  if (nationalDigits.length === 0 || callingCode === '') return null;

  // Parse-side read of the same digits; only a strict-suffix result names a droppable leading chunk.
  const reparsed: ResolvedNumberState = resolveNumber({
    input: `+${callingCode}${nationalDigits}`,
    hasLeadingPlus: true,
    seedCallingCode: null,
    defaultRegionIndex,
    regionFilter,
    numberTypeFilter,
    strict,
  });
  const reparsedDigits: string = reparsed.snapshot.nationalDigits;
  if (reparsedDigits === nationalDigits || !nationalDigits.endsWith(reparsedDigits)) return null;

  // The rescued number must be valid for the typed prefix to be the explanation.
  if (getNumberType(toResolvedPhoneNumber(reparsed, defaultRegionIndex, null)) === 'UNKNOWN') return null;

  return {
    kind: 'NATIONAL_PREFIX_PRESENT',
    prefix: nationalDigits.slice(0, nationalDigits.length - reparsedDigits.length),
  };
}
