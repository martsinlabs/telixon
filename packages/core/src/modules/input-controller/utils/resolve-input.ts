import { digitValue, FIRST_MAPPED_SCRIPT } from '@telixon/core/utils/digit-value';
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
  let code: number;
  let digitIndex = 0;

  // ---- BEFORE ----
  for (let i = 0; i < selectionStart; i++) {
    code = value.charCodeAt(i);
    digit = code - 48;
    // ASCII answers inline; only a character above the Latin blocks reaches the script reader.
    if (digit < 0 || digit > 9) {
      if (code < FIRST_MAPPED_SCRIPT) continue;
      digit = digitValue(code);
      if (digit === -1) continue;
    }
    onDigit(digit, digitIndex);
    digitIndex++;
  }

  // ---- INSERT ----
  for (let i = 0; i < change.insertText.length; i++) {
    code = change.insertText.charCodeAt(i);
    digit = code - 48;
    if (digit < 0 || digit > 9) {
      if (code < FIRST_MAPPED_SCRIPT) continue;
      digit = digitValue(code);
      if (digit === -1) continue;
    }
    onDigit(digit, digitIndex);
    digitIndex++;
  }

  const caretIndex: number = digitIndex;

  // ---- AFTER ----
  for (let i = selectionEnd; i < valueLength; i++) {
    code = value.charCodeAt(i);
    digit = code - 48;
    if (digit < 0 || digit > 9) {
      if (code < FIRST_MAPPED_SCRIPT) continue;
      digit = digitValue(code);
      if (digit === -1) continue;
    }
    onDigit(digit, digitIndex);
    digitIndex++;
  }

  return caretIndex;
}
