import { ResolvedPhoneNumber } from '../models';
import { formatInternational } from './format-international';

// RFC3966 URI ('tel:+<callingCode>-<national>'), or null until the number is possible.
// Same grouping as the international format, with every separator normalized to a hyphen.
export function getURI(resolved: ResolvedPhoneNumber): string | null {
  const international: string | null = formatInternational(resolved);
  if (international === null) return null;
  return `tel:${international.replace(/[^\d+]/g, '-')}`;
}
