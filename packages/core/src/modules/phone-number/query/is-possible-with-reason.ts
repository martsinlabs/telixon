import { containsLength, isCallingCodeComplete } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import {
  PossibilityLengthMasks,
  resolvePossibilityLengthMasks,
} from '../../number-resolver/utils/resolve-possibility-length-masks';
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
  // Beyond every valid national length; guard before containsLength, whose `1 << length` wraps past 31.
  if (length >= 32) return 'TOO_LONG';

  const masks: PossibilityLengthMasks = resolvePossibilityLengthMasks(
    callingCodeState,
    defaultRegionIndex,
    regionFilter,
    numberTypeFilter,
  );

  // Active filters that leave no possible length at all exclude the whole calling code (Telixon extension).
  if ((regionFilter !== null || numberTypeFilter !== null) && masks.national === 0 && masks.localOnly === 0) {
    return 'INVALID_CALLING_CODE';
  }

  // Lengths valid only locally (never nationally) report as locally possible: libphonenumber testNumberLength.
  const localOnlyMask: number = masks.localOnly & ~masks.national;
  if (containsLength(localOnlyMask, length)) return 'IS_POSSIBLE_LOCAL_ONLY';

  if (masks.national === 0) return 'INVALID_LENGTH';
  return validationResultFromLength(masks.national, length);
}
