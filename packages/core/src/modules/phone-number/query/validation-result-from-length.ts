import { containsLength, getMaxLength } from '@telixon/core/engine';
import { PossibilityResult } from '../models';
import { getMinLength } from './length-utils';

export function validationResultFromLength(mask: number, length: number): PossibilityResult {
  if (containsLength(mask, length)) return 'IS_POSSIBLE';
  if (length < getMinLength(mask)) return 'TOO_SHORT';
  if (length > getMaxLength(mask)) return 'TOO_LONG';
  return 'INVALID_LENGTH';
}
