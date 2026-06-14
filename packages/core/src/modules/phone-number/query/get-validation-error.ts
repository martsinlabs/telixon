import {
  getMaxLength,
  getMetadataFormatIndex,
  getRegionNationalPrefix,
  isFormatPrefixOptional,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { getAllowedLengthMask } from '../../number-resolver/utils/get-allowed-length-mask';
import { resolvePrimaryCountryIndex } from '../../number-resolver/utils/resolve-primary-country-index';
import { selectNationalFormatIndex } from '../../number-resolver/utils/select-national-format';
import { PhoneNumberValidationResult, ResolvedPhoneNumber, ValidationError } from '../models';
import { getMinLength, getPossibleLengths } from './length-utils';

/** Returns the highest-precedence validation error for the resolved number, or `null` when none apply. */
export function getValidationError(
  resolved: ResolvedPhoneNumber,
  reason: PhoneNumberValidationResult,
  valid: boolean,
): ValidationError | null {
  const {
    nationalDigits,
    callingCode,
    callingCodeState,
    defaultCountryIndex,
    countryFilter,
    numberTypeFilter,
    nationalPrefixPresent,
  } = resolved;

  if (nationalDigits.length === 0 && callingCode.length === 0) return { kind: 'EMPTY' };

  if (reason === 'INVALID_COUNTRY_CODE') return { kind: 'INVALID_COUNTRY_CODE' };

  const countryIndex: number = resolvePrimaryCountryIndex(callingCodeState, defaultCountryIndex);
  const nationalMask: number = getAllowedLengthMask(countryIndex, countryFilter, numberTypeFilter);

  if (reason === 'TOO_SHORT') return { kind: 'TOO_SHORT', minLength: getMinLength(nationalMask) };
  if (reason === 'TOO_LONG') return { kind: 'TOO_LONG', maxLength: getMaxLength(nationalMask) };
  if (reason === 'INVALID_LENGTH') return { kind: 'INVALID_LENGTH', possibleLengths: getPossibleLengths(nationalMask) };

  if (!valid) return { kind: 'PATTERN_MISMATCH' };

  if (!nationalPrefixPresent) {
    return detectNationalPrefixMissing(countryIndex, nationalDigits);
  }

  return null;
}

/** Returns `NATIONAL_PREFIX_MISSING` when the matching format requires the national prefix and the typed digits omit it; otherwise `null`. */
function detectNationalPrefixMissing(countryIndex: number, nationalDigits: string): ValidationError | null {
  const resourceProvider = getResourceProvider();
  if (countryIndex < 0) return null;

  const nationalPrefix: string | undefined = getRegionNationalPrefix(resourceProvider.engine, countryIndex);
  if (!nationalPrefix) return null;

  const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(countryIndex);
  if (callingCodeIndex === -1) return null;

  const formatPosition: number = selectNationalFormatIndex(callingCodeIndex, nationalDigits, false);
  if (formatPosition < 0) return null;

  const formatIndex: number = getMetadataFormatIndex(resourceProvider.engine, callingCodeIndex, formatPosition);
  if (isFormatPrefixOptional(resourceProvider.engine, formatIndex)) return null;

  return { kind: 'NATIONAL_PREFIX_MISSING', expectedPrefix: nationalPrefix };
}
