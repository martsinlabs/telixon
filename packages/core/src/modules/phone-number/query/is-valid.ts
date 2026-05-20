import { containsLength, getLengthMask } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { isGeneralDescProfile } from '../../number-resolver/utils/is-general-desc-profile';
import { ResolvedPhoneNumber } from '../models';

export function isValid(resolved: ResolvedPhoneNumber): boolean {
  const { profileRef, nationalDigits } = resolved;
  if (!profileRef) return false;
  if (isGeneralDescProfile(profileRef)) return false;

  const mask: number = getLengthMask(getResourceProvider().numberTypeProfileLayer, profileRef.numberTypeProfileId);
  return containsLength(mask, nationalDigits.length);
}
