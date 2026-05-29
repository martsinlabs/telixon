import { containsLength } from '@telixon/core/engine';
import { getAllowedLengthMask } from '../../number-resolver/utils/get-allowed-length-mask';
import { getAllowedLocalOnlyLengthMask } from '../../number-resolver/utils/get-allowed-local-only-length-mask';
import { resolvePrimaryCountryIndex } from '../../number-resolver/utils/resolve-primary-country-index';
import { PhoneNumberValidationResult, ResolvedPhoneNumber } from '../models';
import { validationResultFromLength } from './validation-result-from-length';

export function isPossibleWithReason(resolved: ResolvedPhoneNumber): PhoneNumberValidationResult {
  const { nationalDigits, callingCodeState, defaultCountryIndex, countryFilter, numberTypeFilter } = resolved;

  const countryIndex: number = resolvePrimaryCountryIndex(callingCodeState, defaultCountryIndex);
  if (countryIndex < 0) return 'INVALID_COUNTRY_CODE';

  const length: number = nationalDigits.length;
  const nationalMask: number = getAllowedLengthMask(countryIndex, countryFilter, numberTypeFilter);

  // Lengths valid only locally (never nationally) report as locally possible: libphonenumber testNumberLength.
  const localOnlyMask: number =
    getAllowedLocalOnlyLengthMask(countryIndex, countryFilter, numberTypeFilter) & ~nationalMask;
  if (containsLength(localOnlyMask, length)) return 'IS_POSSIBLE_LOCAL_ONLY';

  if (nationalMask === 0) return 'INVALID_LENGTH';
  return validationResultFromLength(nationalMask, length);
}
