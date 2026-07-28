// Port of libphonenumber's extractPossibleNumber at the engine's pinned commit: cut to the first
// plus or digit, drop trailing characters that are neither digit, letter, nor `#`, then cut before
// a second number marked `/x` or `\x`. Runs once per parse, ahead of the extension strip.

// PLUS_CHARS and VALID_DIGITS from PhoneNumberUtil: ASCII plus fullwidth plus, ASCII, fullwidth,
// Arabic-Indic, and Extended Arabic-Indic digits.
function isPlusOrDigit(code: number): boolean {
  return (
    code === 0x2b ||
    code === 0xff0b ||
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0xff10 && code <= 0xff19) ||
    (code >= 0x0660 && code <= 0x0669) ||
    (code >= 0x06f0 && code <= 0x06f9)
  );
}

// The complement of UNWANTED_END_CHAR_PATTERN_: trailing characters that survive the end trim.
function isWantedEndChar(code: number): boolean {
  return (
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a) ||
    code === 0x23 ||
    (code >= 0xff10 && code <= 0xff19) ||
    (code >= 0x0660 && code <= 0x0669) ||
    (code >= 0x06f0 && code <= 0x06f9)
  );
}

// SECOND_NUMBER_START_PATTERN_ (/[\\\/] *x/): the index cutting off a second number, or -1.
function findSecondNumberStart(input: string): number {
  for (let index = 0; index < input.length; index++) {
    const code: number = input.charCodeAt(index);
    if (code !== 0x2f && code !== 0x5c) continue;
    let lookahead: number = index + 1;
    while (lookahead < input.length && input.charCodeAt(lookahead) === 0x20) lookahead++;
    if (lookahead < input.length && input.charCodeAt(lookahead) === 0x78) return index;
  }
  return -1;
}

/**
 * Trims `input` to the candidate phone number, mirroring libphonenumber's extractPossibleNumber.
 * Returns the empty string when no plus sign or digit starts a candidate.
 */
export function extractPossibleNumber(input: string): string {
  let start = 0;
  while (start < input.length && !isPlusOrDigit(input.charCodeAt(start))) start++;
  if (start === input.length) return '';

  let end: number = input.length;
  while (end > start && !isWantedEndChar(input.charCodeAt(end - 1))) end--;

  const candidate: string = input.slice(start, end);
  const secondNumberStart: number = findSecondNumberStart(candidate);
  return secondNumberStart >= 0 ? candidate.slice(0, secondNumberStart) : candidate;
}
