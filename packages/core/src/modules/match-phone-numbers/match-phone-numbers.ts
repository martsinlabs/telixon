import { REGION_CODES, RegionCode } from '@telixon/core/engine';
import { requireEngineReady } from '@telixon/core/utils/require-engine-ready';
import { resolveNumber } from '../number-resolver/resolve-number';
import { resolvePrimaryRegionIndex } from '../number-resolver/utils/resolve-primary-region-index';
import { parsePhoneNumber } from '../parse-phone-number';
import { extractPossibleNumber } from '../parse-phone-number/utils/extract-possible-number';
import { stripExtension } from '../parse-phone-number/utils/strip-extension';
import { PhoneNumber } from '../phone-number';
import { PhoneNumberMatch } from './models';

// Port of libphonenumber's isNumberMatch. The compared core fields: the calling code, the
// national number split into leading zeros and the numeric remainder, and the extension.
interface ComparableNumber {
  readonly callingCode: string;
  readonly numericNationalNumber: string;
  readonly leadingZeros: number;
  readonly extension: string;
}

// libphonenumber MIN_LENGTH_FOR_NSN_ and MAX_LENGTH_FOR_NSN_: parse rejects a national number
// outside these bounds, and the match ladder reports such input as NOT_A_NUMBER.
const MIN_NATIONAL_NUMBER_LENGTH = 2;
const MAX_NATIONAL_NUMBER_LENGTH = 17;

function nationalNumberLengthOutOfBounds(digits: string): boolean {
  return digits.length < MIN_NATIONAL_NUMBER_LENGTH || digits.length > MAX_NATIONAL_NUMBER_LENGTH;
}

function collectAsciiDigits(input: string): string {
  let digits = '';
  for (let index = 0; index < input.length; index++) {
    const charCode: number = input.charCodeAt(index);
    if (charCode >= 0x30 && charCode <= 0x39) digits += input[index];
  }
  return digits;
}

// The national number the way libphonenumber stores it: a leading-zero count, capped so at least
// one digit remains, and the numeric remainder.
function splitLeadingZeros(nationalDigits: string): { numeric: string; zeros: number } {
  let zeros = 0;
  while (zeros < nationalDigits.length - 1 && nationalDigits.charCodeAt(zeros) === 0x30) zeros++;
  return { numeric: nationalDigits.slice(zeros), zeros };
}

function toComparable(number: PhoneNumber): ComparableNumber {
  const { numeric, zeros } = splitLeadingZeros(number.getNationalNumber());
  return {
    callingCode: number.getCallingCode() ?? '',
    numericNationalNumber: numeric,
    leadingZeros: zeros,
    extension: number.getExtension() ?? '',
  };
}

// The read libphonenumber's parseHelper does with no region: digits and extension only, with no
// calling code and no prefix stripping.
function toComparableWithoutCallingCode(base: string, extension: string | null): ComparableNumber {
  const { numeric, zeros } = splitLeadingZeros(collectAsciiDigits(base));
  return { callingCode: '', numericNationalNumber: numeric, leadingZeros: zeros, extension: extension ?? '' };
}

// The fields shared by both grades: the national number split and the extension.
function nationalFieldsEqual(first: ComparableNumber, second: ComparableNumber): boolean {
  return (
    first.numericNationalNumber === second.numericNationalNumber &&
    first.leadingZeros === second.leadingZeros &&
    first.extension === second.extension
  );
}

function coreFieldsEqual(first: ComparableNumber, second: ComparableNumber): boolean {
  return first.callingCode === second.callingCode && nationalFieldsEqual(first, second);
}

// True when one numeric national number is the suffix of the other, equality included.
function isNationalNumberSuffixOfTheOther(first: ComparableNumber, second: ComparableNumber): boolean {
  return (
    first.numericNationalNumber.endsWith(second.numericNationalNumber) ||
    second.numericNationalNumber.endsWith(first.numericNationalNumber)
  );
}

function compareResolved(first: ComparableNumber, second: ComparableNumber): PhoneNumberMatch {
  // Two different explicit extensions never match.
  if (first.extension.length > 0 && second.extension.length > 0 && first.extension !== second.extension) {
    return 'NO_MATCH';
  }

  if (first.callingCode !== '' && second.callingCode !== '') {
    if (coreFieldsEqual(first, second)) return 'EXACT_MATCH';
    if (first.callingCode === second.callingCode && isNationalNumberSuffixOfTheOther(first, second)) {
      return 'SHORT_NSN_MATCH';
    }
    return 'NO_MATCH';
  }

  // At least one side carries no calling code; the calling codes drop out of the comparison.
  if (nationalFieldsEqual(first, second)) return 'NSN_MATCH';
  if (isNationalNumberSuffixOfTheOther(first, second)) return 'SHORT_NSN_MATCH';
  return 'NO_MATCH';
}

interface StringRead {
  readonly comparable: ComparableNumber | null;
  // The string carried an explicit plus and its calling code resolved.
  readonly internationalRead: boolean;
}

// Reads a string the way libphonenumber's match ladder parses it under the unknown region: an
// explicit plus reads as international, anything else as national digits with no calling code.
// `null` means no number could be read.
function readString(input: string): StringRead {
  const { base, extension } = stripExtension(extractPossibleNumber(input).candidate);

  const firstCode: number = base.charCodeAt(0);
  if (firstCode !== 0x2b && firstCode !== 0xff0b) {
    // Without a calling code the whole read is the national number; the bounds apply to it directly.
    if (nationalNumberLengthOutOfBounds(collectAsciiDigits(base))) {
      return { comparable: null, internationalRead: false };
    }
    return { comparable: toComparableWithoutCallingCode(base, extension), internationalRead: false };
  }

  const parsed: PhoneNumber = parsePhoneNumber(input);
  if (parsed.getCallingCode() === null || parsed.isPossibleWithReason() === 'INVALID_CALLING_CODE') {
    return { comparable: null, internationalRead: false };
  }
  if (nationalNumberLengthOutOfBounds(parsed.getNationalNumber())) {
    return { comparable: null, internationalRead: false };
  }
  return { comparable: toComparable(parsed), internationalRead: true };
}

// The main region of a calling code (libphonenumber getRegionCodeForCountryCode), or null.
function mainRegionForCallingCode(callingCode: string): RegionCode | null {
  if (callingCode === '') return null;
  const resolved = resolveNumber({
    input: `+${callingCode}`,
    hasLeadingPlus: true,
    seedCallingCode: null,
    defaultRegionIndex: -1,
    regionFilter: null,
    numberTypeFilter: null,
    strict: false,
  });
  const regionIndex: number = resolvePrimaryRegionIndex(resolved.snapshot.callingCodeState, -1);
  return regionIndex >= 0 ? (REGION_CODES[regionIndex] ?? null) : null;
}

// A national string against a side with a calling code: the string parses again under that calling
// code's main region, and an exact agreement demotes to NSN_MATCH, since the string never named
// the calling code itself.
function matchNationalStringAgainstResolved(nationalInput: string, resolved: ComparableNumber): PhoneNumberMatch {
  const region: RegionCode | null = mainRegionForCallingCode(resolved.callingCode);
  if (region === null) {
    const { base, extension } = stripExtension(extractPossibleNumber(nationalInput).candidate);
    return compareResolved(toComparableWithoutCallingCode(base, extension), resolved);
  }

  const reparsedNumber: PhoneNumber = parsePhoneNumber(nationalInput, { defaultRegion: region });
  if (nationalNumberLengthOutOfBounds(reparsedNumber.getNationalNumber())) return 'NOT_A_NUMBER';
  const match: PhoneNumberMatch = compareResolved(toComparable(reparsedNumber), resolved);
  return match === 'EXACT_MATCH' ? 'NSN_MATCH' : match;
}

/**
 * Grades whether two inputs denote the same phone number, mirroring libphonenumber's
 * isNumberMatch. Accepts raw strings and parsed {@link PhoneNumber} values in any combination. A
 * string without an explicit `+` reads as national digits; when the other side carries a calling
 * code, its main region parses them, capping the grade at `NSN_MATCH`.
 *
 * @example
 * matchPhoneNumbers('+1 415 555 0132', '+1 (415) 555-0132'); // 'EXACT_MATCH'
 * matchPhoneNumbers('415 555 0132', '+1 415 555 0132'); // 'NSN_MATCH'
 */
export function matchPhoneNumbers(first: string | PhoneNumber, second: string | PhoneNumber): PhoneNumberMatch {
  requireEngineReady();

  if (typeof first === 'string' && typeof second === 'string') {
    const firstRead: StringRead = readString(first);
    if (firstRead.comparable === null) return 'NOT_A_NUMBER';
    const secondRead: StringRead = readString(second);
    if (secondRead.comparable === null) return 'NOT_A_NUMBER';

    if (firstRead.internationalRead && !secondRead.internationalRead) {
      return matchNationalStringAgainstResolved(second, firstRead.comparable);
    }
    if (!firstRead.internationalRead && secondRead.internationalRead) {
      return matchNationalStringAgainstResolved(first, secondRead.comparable);
    }
    return compareResolved(firstRead.comparable, secondRead.comparable);
  }

  if (typeof second === 'string') return matchPhoneNumbers(second, first);

  if (typeof first === 'string') {
    const read: StringRead = readString(first);
    if (read.comparable === null) return 'NOT_A_NUMBER';
    const secondComparable: ComparableNumber = toComparable(second);
    if (!read.internationalRead) return matchNationalStringAgainstResolved(first, secondComparable);
    return compareResolved(read.comparable, secondComparable);
  }

  return compareResolved(toComparable(first), toComparable(second));
}
