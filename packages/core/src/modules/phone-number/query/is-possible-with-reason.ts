import { getAllowedLengthMask } from '../../number-resolver/utils/get-allowed-length-mask';
import { resolveCountryIndex } from '../../number-resolver/utils/resolve-country-index';
import { PhoneNumberValidationResult, ResolvedPhoneNumber } from '../models';
import { validationResultFromLength } from './validation-result-from-length';

export function isPossibleWithReason(resolved: ResolvedPhoneNumber): PhoneNumberValidationResult {
  const { profileRef, nationalDigits, callingCodeState, defaultCountryIndex, countryFilter, numberTypeFilter } =
    resolved;

  const countryIndex: number = resolveCountryIndex(callingCodeState, profileRef, defaultCountryIndex);
  if (countryIndex < 0) return 'INVALID_COUNTRY_CODE';

  const mask: number = getAllowedLengthMask(countryIndex, countryFilter, numberTypeFilter);
  if (mask === 0) return 'INVALID_LENGTH';

  return validationResultFromLength(mask, nationalDigits.length);
}
