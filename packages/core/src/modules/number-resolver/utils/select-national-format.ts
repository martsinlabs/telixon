import { PhoneNumberFormat, PhoneNumberFormatList } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { fullPattern } from './full-pattern';
import { matchesLeadingDigits } from './matches-leading-digits';

// chooseFormattingPattern for NATIONAL: leadingDigits + full pattern, over every format (incl. national-only).
function matchesComplete(format: PhoneNumberFormat, nationalDigits: string): boolean {
  if (format.leadingDigits && !matchesLeadingDigits(format.leadingDigits, nationalDigits)) return false;
  return fullPattern(format.pattern).test(nationalDigits);
}

// Index of the matching national format, or -1 (then the number stays ungrouped).
export function selectNationalFormatIndex(callingCodeIndex: number, nationalDigits: string): number {
  const formats: PhoneNumberFormatList = getResourceProvider().formatsTable[callingCodeIndex]!;
  for (let index = 0; index < formats.length; index += 1) {
    if (matchesComplete(formats[index]!, nationalDigits)) return index;
  }
  return -1;
}
