import { ResolvedPhoneNumber } from '../models';
import { isPossible } from './is-possible';

// Canonical E.164, or null until possible (formats possible-but-invalid numbers, like libphonenumber).
export function formatE164(resolved: ResolvedPhoneNumber): string | null {
  // E.164 carries a calling code, which digits the walk read none from cannot supply.
  if (resolved.callingCode === '' || !isPossible(resolved)) return null;
  return `+${resolved.callingCode}${resolved.nationalDigits}`;
}
