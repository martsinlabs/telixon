import { ResolvedPhoneNumber } from '../models';

// Resolved calling code digits (e.g. '1', '44'), or null when none has resolved.
export function getCallingCode(resolved: ResolvedPhoneNumber): string | null {
  return resolved.callingCode.length > 0 ? resolved.callingCode : null;
}
