import { ResolvedPhoneNumber } from '../models';
import { isPossibleWithReason } from './is-possible-with-reason';

export function isPossible(resolved: ResolvedPhoneNumber): boolean {
  const reason = isPossibleWithReason(resolved);
  return reason === 'IS_POSSIBLE' || reason === 'IS_POSSIBLE_LOCAL_ONLY';
}
