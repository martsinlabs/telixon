import { RegionCode } from '@telixon/core/engine';
import { resolveRegionCodeFast } from '../../number-resolver/utils/resolve-region-code';
import { ResolvedPhoneNumber } from '../models';

// Region the number belongs to (libphonenumber getRegionCodeForNumber): one baked verdict lookup, with the explicit resolution behind it.
export function getRegion(resolved: ResolvedPhoneNumber): RegionCode | null {
  return resolveRegionCodeFast(resolved.callingCodeState, resolved.endState, resolved.nationalDigits);
}
