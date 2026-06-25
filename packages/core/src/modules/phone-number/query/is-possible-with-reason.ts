import { containsLength, isCallingCodeComplete } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getAllowedLengthMask } from '../../number-resolver/utils/get-allowed-length-mask';
import { getAllowedLocalOnlyLengthMask } from '../../number-resolver/utils/get-allowed-local-only-length-mask';
import { resolvePrimaryRegionIndex } from '../../number-resolver/utils/resolve-primary-region-index';
import { PossibilityResult, ResolvedPhoneNumber } from '../models';
import { validationResultFromLength } from './validation-result-from-length';

export function isPossibleWithReason(resolved: ResolvedPhoneNumber): PossibilityResult {
  const { nationalDigits, callingCodeState, defaultRegionIndex, regionFilter, numberTypeFilter } = resolved;

  // A '+' number whose calling code never reached a terminal state is not a valid calling code
  // (libphonenumber rejects it at parse).
  if (callingCodeState !== -1 && !isCallingCodeComplete(getResourceProvider().engine, callingCodeState)) {
    return 'INVALID_CALLING_CODE';
  }

  const regionIndex: number = resolvePrimaryRegionIndex(callingCodeState, defaultRegionIndex);
  if (regionIndex < 0) return 'INVALID_CALLING_CODE';

  const length: number = nationalDigits.length;
  const nationalMask: number = getAllowedLengthMask(regionIndex, regionFilter, numberTypeFilter);

  // Lengths valid only locally (never nationally) report as locally possible: libphonenumber testNumberLength.
  const localOnlyMask: number =
    getAllowedLocalOnlyLengthMask(regionIndex, regionFilter, numberTypeFilter) & ~nationalMask;
  if (containsLength(localOnlyMask, length)) return 'IS_POSSIBLE_LOCAL_ONLY';

  if (nationalMask === 0) return 'INVALID_LENGTH';
  return validationResultFromLength(nationalMask, length);
}
