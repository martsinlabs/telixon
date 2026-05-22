import { PhoneNumberFormat, PhoneNumberFormatList } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { fullPattern } from './full-pattern';
import { matchesLeadingDigits } from './matches-leading-digits';

// libphonenumber chooseFormattingPattern for NATIONAL: leadingDigits prefix + full national pattern,
// over every format (national-only formats included, unlike the international selector).
function matchesComplete(format: PhoneNumberFormat, nationalDigits: string): boolean {
  if (format.leadingDigits && !matchesLeadingDigits(format.leadingDigits, nationalDigits)) return false;
  return fullPattern(format.pattern).test(nationalDigits);
}

// Index of the national format for `nationalDigits` within the calling code's list, or -1 when no
// pattern matches (libphonenumber then leaves the number ungrouped).
export function selectNationalFormatIndex(callingCodeIndex: number, nationalDigits: string): number {
  const formats: PhoneNumberFormatList = getResourceProvider().formatsTable[callingCodeIndex]!;
  for (let index = 0; index < formats.length; index += 1) {
    if (matchesComplete(formats[index]!, nationalDigits)) return index;
  }
  return -1;
}
