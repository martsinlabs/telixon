import { ResolvedPhoneNumber } from '../models';
import { isPossible } from './is-possible';

// Canonical E.164 ('+' + calling code + national number), or null until the number is possible.
// Formats possible-but-invalid numbers, matching libphonenumber's format (which is validity-independent).
export function getE164(resolved: ResolvedPhoneNumber): string | null {
  if (!isPossible(resolved)) return null;
  return `+${resolved.callingCode}${resolved.nationalDigits}`;
}
