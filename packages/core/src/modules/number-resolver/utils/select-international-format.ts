import { PhoneNumberFormat, PhoneNumberFormatList } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { matchesLeadingDigits } from './matches-leading-digits';

// Compiled full-pattern matchers; selection runs per keystroke, so the regex is memoized.
const fullPatterns = new Map<string, RegExp>();

function fullPattern(pattern: string): RegExp {
  let matcher: RegExp | undefined = fullPatterns.get(pattern);
  if (!matcher) {
    matcher = new RegExp(`^(?:${pattern})$`);
    fullPatterns.set(pattern, matcher);
  }
  return matcher;
}

// libphonenumber chooseFormattingPatternForNumber: leadingDigits prefix + full national pattern,
// skipping formats not used internationally.
function matchesComplete(format: PhoneNumberFormat, nationalDigits: string): boolean {
  if (format.intlFormat === 'NA') return false;
  if (format.leadingDigits && !matchesLeadingDigits(format.leadingDigits, nationalDigits)) return false;
  return fullPattern(format.pattern).test(nationalDigits);
}

// As-you-type fallback before the number is complete: leadingDigits prefix while still shorter than
// the format's max. At max length without a complete match the number is unformattable, so we leave
// it ungrouped — matching formatInternational rather than over-grouping it.
function matchesPartial(format: PhoneNumberFormat, nationalDigits: string): boolean {
  if (format.intlFormat === 'NA') return false;
  if (nationalDigits.length === 0 || nationalDigits.length >= format.lengthRange[1]) return false;
  return matchesLeadingDigits(format.leadingDigits, nationalDigits);
}

// Index of the international format for `nationalDigits` within the calling code's list, or -1.
// Prefers a complete pattern match (identical to formatInternational). The partial match is only for
// numbers still being typed (allowPartial); a complete number with no full match stays ungrouped.
export function selectInternationalFormatIndex(
  callingCodeIndex: number,
  nationalDigits: string,
  allowPartial: boolean,
): number {
  const formats: PhoneNumberFormatList = getResourceProvider().formatsTable[callingCodeIndex]!;
  for (let index = 0; index < formats.length; index += 1) {
    if (matchesComplete(formats[index]!, nationalDigits)) return index;
  }
  if (!allowPartial) return -1;
  for (let index = 0; index < formats.length; index += 1) {
    if (matchesPartial(formats[index]!, nationalDigits)) return index;
  }
  return -1;
}
