import { NumberResolver } from '../../number-resolver';
import { CaretIndex, InputChange } from '../models';

/**
 * Replays all digits of the resulting input through the resolver.
 *
 * @param value Raw input value.
 * @param change Input change description.
 * @param resolver Prepared NumberResolver (will be mutated).
 * @returns Caret index relative to the extracted digit sequence.
 */
export function resolveInput(value: string, change: InputChange, resolver: NumberResolver): CaretIndex {
  const valueLength: number = value.length;
  const selectionStart: number = Math.max(0, Math.min(change.selectionStart, valueLength));
  const selectionEnd: number = Math.max(selectionStart, Math.min(change.selectionEnd, valueLength));

  let digit: number;
  let digitIndex = 0;

  // ---- BEFORE ----
  for (let i = 0; i < selectionStart; i++) {
    digit = value.charCodeAt(i) - 48;

    if (digit < 0 || digit > 9) continue;

    digitIndex++;

    resolver.advance(digit);
  }

  // ---- INSERT ----
  for (let i = 0; i < change.insertText.length; i++) {
    digit = change.insertText.charCodeAt(i) - 48;

    if (digit < 0 || digit > 9) continue;

    digitIndex++;

    resolver.advance(digit);
  }

  const caretIndex: number = digitIndex;

  // ---- AFTER ----
  for (let i = selectionEnd; i < valueLength; i++) {
    digit = value.charCodeAt(i) - 48;

    if (digit < 0 || digit > 9) continue;

    digitIndex++;

    resolver.advance(digit);
  }

  return caretIndex;
}
