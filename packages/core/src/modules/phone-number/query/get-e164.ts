import { ResolvedPhoneNumber } from '../models';
import { isPossible } from './is-possible';

// Canonical E.164, or null until possible (formats possible-but-invalid numbers, like libphonenumber).
export function getE164(resolved: ResolvedPhoneNumber): string | null {
  if (!isPossible(resolved)) return null;
  return `+${resolved.callingCode}${resolved.nationalDigits}`;
}
