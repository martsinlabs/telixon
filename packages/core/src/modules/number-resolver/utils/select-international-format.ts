import { PhoneNumberFormat, PhoneNumberFormatList } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { fullPattern } from './full-pattern';
import { matchesLeadingDigits } from './matches-leading-digits';

// libphonenumber chooseFormattingPatternForNumber: leadingDigits prefix + full national pattern,
// skipping formats not used internationally.
function matchesComplete(format: PhoneNumberFormat, nationalDigits: string): boolean {
  if (format.intlFormat === 'NA') return false;
  const digitsLength: number = nationalDigits.length;
  if (digitsLength < format.lengthRange[0] || digitsLength > format.lengthRange[1]) return false;
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

interface FormatIndexCacheEntry {
  complete: number;
  partial: number;
}
const FORMAT_INDEX_CACHE_MAX_ENTRIES: number = 50_000;
const FORMAT_INDEX_CACHE = new Map<number, Map<string, FormatIndexCacheEntry>>();
let formatIndexCacheEntryCount: number = 0;

// Index of the international format for `nationalDigits` within the calling code's list, or -1.
// Prefers a complete pattern match (identical to formatInternational). The partial match is only for
// numbers still being typed (allowPartial); a complete number with no full match stays ungrouped.
export function selectInternationalFormatIndex(
  callingCodeIndex: number,
  nationalDigits: string,
  allowPartial: boolean,
): number {
  const cachedForCallingCode = FORMAT_INDEX_CACHE.get(callingCodeIndex);
  if (cachedForCallingCode !== undefined) {
    const cachedEntry = cachedForCallingCode.get(nationalDigits);
    if (cachedEntry !== undefined) {
      return allowPartial && cachedEntry.complete === -1 ? cachedEntry.partial : cachedEntry.complete;
    }
  }

  const formats: PhoneNumberFormatList = getResourceProvider().formatsTable[callingCodeIndex]!;

  let completeIndex = -1;
  for (let formatIndex = 0; formatIndex < formats.length; formatIndex += 1) {
    if (matchesComplete(formats[formatIndex]!, nationalDigits)) {
      completeIndex = formatIndex;
      break;
    }
  }

  let partialIndex = -1;
  if (completeIndex === -1) {
    for (let formatIndex = 0; formatIndex < formats.length; formatIndex += 1) {
      if (matchesPartial(formats[formatIndex]!, nationalDigits)) {
        partialIndex = formatIndex;
        break;
      }
    }
  }

  if (formatIndexCacheEntryCount >= FORMAT_INDEX_CACHE_MAX_ENTRIES) {
    FORMAT_INDEX_CACHE.clear();
    formatIndexCacheEntryCount = 0;
  }
  let cacheForCallingCode = FORMAT_INDEX_CACHE.get(callingCodeIndex);
  if (cacheForCallingCode === undefined) {
    cacheForCallingCode = new Map();
    FORMAT_INDEX_CACHE.set(callingCodeIndex, cacheForCallingCode);
  }
  if (!cacheForCallingCode.has(nationalDigits)) formatIndexCacheEntryCount++;
  cacheForCallingCode.set(nationalDigits, { complete: completeIndex, partial: partialIndex });

  if (completeIndex !== -1) return completeIndex;
  return allowPartial ? partialIndex : -1;
}
