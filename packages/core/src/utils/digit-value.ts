// Digit ranges google/libphonenumber maps in DIGIT_MAPPINGS: ASCII, fullwidth, Arabic-Indic, and
// extended Arabic-Indic. Every other script's digits stay unread, as they do there.
const ARABIC_INDIC_ZERO = 0x0660;

/** The lowest character the non-ASCII ranges start at; a reader below it is done after the ASCII test. */
export const FIRST_MAPPED_SCRIPT = ARABIC_INDIC_ZERO;
const EXTENDED_ARABIC_INDIC_ZERO = 0x06f0;
const FULLWIDTH_ZERO = 0xff10;

/**
 * The value of a digit character, or `-1`. ASCII answers on the first comparison and every other
 * character below the Arabic block on the second, which leaves a field's own text two comparisons.
 */
export function digitValue(charCode: number): number {
  if (charCode >= 0x30 && charCode <= 0x39) return charCode - 0x30;
  if (charCode < ARABIC_INDIC_ZERO) return -1;
  if (charCode <= ARABIC_INDIC_ZERO + 9) return charCode - ARABIC_INDIC_ZERO;
  if (charCode >= EXTENDED_ARABIC_INDIC_ZERO && charCode <= EXTENDED_ARABIC_INDIC_ZERO + 9) {
    return charCode - EXTENDED_ARABIC_INDIC_ZERO;
  }
  if (charCode >= FULLWIDTH_ZERO && charCode <= FULLWIDTH_ZERO + 9) return charCode - FULLWIDTH_ZERO;
  return -1;
}

/** Whether the character is one the digit reader accepts. */
export function isDigitCharCode(charCode: number): boolean {
  return digitValue(charCode) !== -1;
}

/** The ASCII digit characters indexed by value, which lets a reader append one without converting a number. */
export const DIGIT_CHARS: readonly string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
