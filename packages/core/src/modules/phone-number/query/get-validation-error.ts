import {
  getMaxLength,
  getMetadataFormatIndex,
  getRegionNationalPrefix,
  isFormatPrefixOptional,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByRegionIndex } from '@telixon/core/utils/get-calling-code-index-by-region-index';
import { getAllowedLengthMask } from '../../number-resolver/utils/get-allowed-length-mask';
import { resolvePrimaryRegionIndex } from '../../number-resolver/utils/resolve-primary-region-index';
import { selectNationalFormatIndex } from '../../number-resolver/utils/select-national-format';
import { PossibilityResult, ResolvedPhoneNumber, ValidationError } from '../models';
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
  } = resolved;

  if (nationalDigits.length === 0 && callingCode.length === 0) return { kind: 'EMPTY' };

  if (reason === 'INVALID_CALLING_CODE') return { kind: 'INVALID_CALLING_CODE' };

  const regionIndex: number = resolvePrimaryRegionIndex(callingCodeState, defaultRegionIndex);
  const nationalMask: number = getAllowedLengthMask(regionIndex, regionFilter, numberTypeFilter);

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

  const formatIndex: number = getMetadataFormatIndex(resourceProvider.engine, callingCodeIndex, formatPosition);
  if (isFormatPrefixOptional(resourceProvider.engine, formatIndex)) return null;

  return { kind: 'NATIONAL_PREFIX_MISSING', expectedPrefix: nationalPrefix };
}
