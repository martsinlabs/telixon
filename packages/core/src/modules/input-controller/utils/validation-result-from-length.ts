import { containsLength, getMaxLength } from '@telixon/core/engine';
import { PhoneNumberValidationResult } from '../models';

function getMinLength(mask: number): number {
  if (mask === 0) return 0;
  return Math.log2(mask & -mask);
}

export function validationResultFromLength(mask: number, length: number): PhoneNumberValidationResult {
  if (containsLength(mask, length)) return 'IS_POSSIBLE';
  if (length < getMinLength(mask)) return 'TOO_SHORT';
  if (length > getMaxLength(mask)) return 'TOO_LONG';
  return 'INVALID_LENGTH';
}
