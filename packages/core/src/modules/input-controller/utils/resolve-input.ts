import { CaretIndex, InputChange } from '../models';

/**
 * Extracts digits from the resulting input and invokes callback for each digit in order.
 *
 * @param value Raw input value.
 * @param change Input change description.
 * @param onDigit Callback invoked for each extracted digit (digit, digitIndex).
 * @returns Caret index relative to the extracted digit sequence.
 */
export function resolveInput(
  value: string,
  change: InputChange,
  onDigit: (digit: number, digitIndex: number) => void,
): CaretIndex {
  const valueLength: number = value.length;
  const selectionStart: number = Math.max(0, Math.min(change.selectionStart, valueLength));
  const selectionEnd: number = Math.max(selectionStart, Math.min(change.selectionEnd, valueLength));

  let digit: number;
  let digitIndex = 0;
  let insertedDigitCount = 0;

  // ---- BEFORE ----
  for (let i = 0; i < selectionStart; i++) {
    digit = value.charCodeAt(i) - 48;
    if (digit < 0 || digit > 9) continue;
    onDigit(digit, digitIndex);
    digitIndex++;
  }

  // ---- INSERT ----
  for (let i = 0; i < change.insertText.length; i++) {
    digit = change.insertText.charCodeAt(i) - 48;
    if (digit < 0 || digit > 9) continue;
    onDigit(digit, digitIndex);
    digitIndex++;
    insertedDigitCount++;
  }

  const caretIndex: number = digitIndex;
  const afterStart: number = insertedDigitCount === 0 && change.insertText.length > 0 ? selectionStart : selectionEnd;

  // ---- AFTER ----
  for (let i = afterStart; i < valueLength; i++) {
    digit = value.charCodeAt(i) - 48;
    if (digit < 0 || digit > 9) continue;
    onDigit(digit, digitIndex);
    digitIndex++;
  }

  return caretIndex;
}
