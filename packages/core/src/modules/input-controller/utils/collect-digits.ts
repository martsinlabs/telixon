import { DIGIT_CHARS, digitValue } from '@telixon/core/utils/digit-value';

/** Extracts the digits of a string in order, written in ASCII. */
export function collectDigits(text: string): string {
  let digits = '';
  for (let index = 0; index < text.length; index++) {
    const value: number = digitValue(text.charCodeAt(index));
    if (value !== -1) digits += DIGIT_CHARS[value];
  }
  return digits;
}
