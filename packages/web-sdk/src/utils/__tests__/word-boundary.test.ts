import { describe, expect, it } from 'vitest';
import { findNextWordBoundary, findPreviousWordBoundary } from '../word-boundary';

describe('findPreviousWordBoundary', () => {
  it('returns 0 when called from the start of the value', () => {
    expect(findPreviousWordBoundary('+1 (212) 555-1234', 0)).toBe(0);
  });

  it('walks back to the start of the current digit group when the caret is at the end of a value', () => {
    const value: string = '+1 (212) 555-1234';
    // Caret at end; word back covers "1234".
    expect(findPreviousWordBoundary(value, value.length)).toBe(13);
  });

  it('walks back to the start of the digit group containing the caret', () => {
    const value: string = '+1 (212) 555-1234';
    // Caret between "55" and "5-1234" (position 11 — inside "555").
    expect(findPreviousWordBoundary(value, 11)).toBe(9);
  });

  it('consumes the trailing non-digit run together with the preceding digit group', () => {
    const value: string = '+1 (212) 555-1234';
    // Caret right after ")" (position 8) — swallow ") "-style run plus the "212" group.
    expect(findPreviousWordBoundary(value, 8)).toBe(4);
  });

  it('walks the entire non-digit run when no digit precedes the caret', () => {
    expect(findPreviousWordBoundary('+', 1)).toBe(0);
    expect(findPreviousWordBoundary('+ (', 3)).toBe(0);
  });

  it('handles an empty value', () => {
    expect(findPreviousWordBoundary('', 0)).toBe(0);
  });

  it('clamps "from" beyond the value length', () => {
    expect(findPreviousWordBoundary('123', 99)).toBe(0);
  });
});

describe('findNextWordBoundary', () => {
  it('returns value.length when called from the end of the value', () => {
    const value: string = '+1 (212) 555-1234';
    expect(findNextWordBoundary(value, value.length)).toBe(value.length);
  });

  it('walks forward to the end of the current digit group', () => {
    const value: string = '+1 (212) 555-1234';
    // Caret inside "212" (position 5) — boundary at end of "212" (position 7).
    expect(findNextWordBoundary(value, 5)).toBe(7);
  });

  it('consumes the leading non-digit run together with the following digit group', () => {
    const value: string = '+1 (212) 555-1234';
    // Caret at position 0 — swallow "+" plus the "1" group.
    expect(findNextWordBoundary(value, 0)).toBe(2);
  });

  it('walks the entire non-digit run when no digit follows the caret', () => {
    expect(findNextWordBoundary('1 ', 2)).toBe(2);
    expect(findNextWordBoundary('1 ( ', 1)).toBe(4);
  });

  it('handles an empty value', () => {
    expect(findNextWordBoundary('', 0)).toBe(0);
  });

  it('clamps negative "from" to 0', () => {
    expect(findNextWordBoundary('123', -5)).toBe(3);
  });
});
