import { ResolvedPhoneNumber } from '../models';
import { isValid } from './is-valid';

// Canonical E.164 ('+' + calling code + national number), or null until the number is valid.
export function getE164(resolved: ResolvedPhoneNumber): string | null {
  if (!isValid(resolved)) return null;
  return `+${resolved.callingCode}${resolved.nationalDigits}`;
}
