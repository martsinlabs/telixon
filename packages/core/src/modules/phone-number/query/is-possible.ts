import { ResolvedPhoneNumber } from '../models';
import { isPossibleWithReason } from './is-possible-with-reason';

export function isPossible(resolved: ResolvedPhoneNumber): boolean {
  return isPossibleWithReason(resolved) === 'IS_POSSIBLE';
}
