import { ResolvedPhoneNumber } from '../models';
import { formatInternationalBase } from './format-international';

// RFC3966 URI ('tel:+<callingCode>-<national>'), or null until possible; same grouping as the international format, separators normalized to hyphens.
export function formatRfc3966(resolved: ResolvedPhoneNumber): string | null {
  const international: string | null = formatInternationalBase(resolved);
  if (international === null) return null;

  let uri = 'tel:';
  for (let index = 0; index < international.length; index++) {
    const code: number = international.charCodeAt(index);
    uri += code === 43 /* + */ || (code >= 48 && code <= 57) /* 0-9 */ ? international[index] : '-';
  }
  if (resolved.extension !== null) uri += `;ext=${resolved.extension}`;
  return uri;
}
