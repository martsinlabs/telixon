import { PhoneNumber, ResolvedPhoneNumber } from './models';
import { getNumberType } from './query/get-number-type';
import { isPossible } from './query/is-possible';
import { isPossibleWithReason } from './query/is-possible-with-reason';
import { isValid } from './query/is-valid';

export function createPhoneNumber(resolved: ResolvedPhoneNumber): PhoneNumber {
  return {
    isValid: () => isValid(resolved),
    isPossible: () => isPossible(resolved),
    isPossibleWithReason: () => isPossibleWithReason(resolved),
    getNumberType: () => getNumberType(resolved),
  };
}
