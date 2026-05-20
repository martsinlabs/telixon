import { ResolvedPhoneNumber } from '../models';

// National significant number: normalized digits, no calling code, no national prefix.
export function getNationalNumber(resolved: ResolvedPhoneNumber): string {
  return resolved.nationalDigits;
}
