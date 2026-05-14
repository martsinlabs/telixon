const CHAR_CODE_ZERO: number = 48;
const CHAR_CODE_NINE: number = 57;

function isDigit(charCode: number): boolean {
  return charCode >= CHAR_CODE_ZERO && charCode <= CHAR_CODE_NINE;
}

// Native Option/Ctrl+Backspace: skip adjacent formatting, then consume the digit group.

export function findPreviousWordBoundary(value: string, from: number): number {
  let i: number = Math.min(from, value.length) - 1;
  if (i < 0) return 0;
  if (!isDigit(value.charCodeAt(i))) {
    while (i >= 0 && !isDigit(value.charCodeAt(i))) i--;
    while (i >= 0 && isDigit(value.charCodeAt(i))) i--;
  } else {
    while (i >= 0 && isDigit(value.charCodeAt(i))) i--;
  }
  return i + 1;
}

export function findNextWordBoundary(value: string, from: number): number {
  const length: number = value.length;
  let i: number = Math.max(0, from);
  if (i >= length) return length;
  if (!isDigit(value.charCodeAt(i))) {
    while (i < length && !isDigit(value.charCodeAt(i))) i++;
    while (i < length && isDigit(value.charCodeAt(i))) i++;
  } else {
    while (i < length && isDigit(value.charCodeAt(i))) i++;
  }
  return i;
}
