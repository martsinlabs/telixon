import { describe, expect, it } from 'vitest';
import { findNextDigitPosition, findPreviousDigitPosition, isFormattingChar } from '../find-digit-position';

describe('findPreviousDigitPosition', () => {
  it('returns -1 for empty string', () => {
    expect(findPreviousDigitPosition('', 0)).toBe(-1);
    expect(findPreviousDigitPosition('', 5)).toBe(-1);
  });

  it('returns -1 when only formatting chars exist', () => {
    expect(findPreviousDigitPosition('()- ', 4)).toBe(-1);
  });

  it('returns -1 when from is 0', () => {
    expect(findPreviousDigitPosition('123', 0)).toBe(-1);
  });

  it('returns the digit immediately before the caret', () => {
    expect(findPreviousDigitPosition('12', 2)).toBe(1);
  });

  it('skips trailing formatting to find the previous digit', () => {
    expect(findPreviousDigitPosition('123-', 4)).toBe(2);
    expect(findPreviousDigitPosition('(12) ', 5)).toBe(2);
  });

  it('treats from beyond length as searching from end', () => {
    expect(findPreviousDigitPosition('12', 100)).toBe(1);
  });
});

describe('findNextDigitPosition', () => {
  it('returns -1 for empty string', () => {
    expect(findNextDigitPosition('', 0)).toBe(-1);
  });

  it('returns -1 when only formatting chars exist', () => {
    expect(findNextDigitPosition('()- ', 0)).toBe(-1);
  });

  it('returns from when from points at a digit', () => {
    expect(findNextDigitPosition('123', 0)).toBe(0);
    expect(findNextDigitPosition('123', 2)).toBe(2);
  });

  it('skips leading formatting to find the next digit', () => {
    expect(findNextDigitPosition('-12', 0)).toBe(1);
    expect(findNextDigitPosition('(  )12', 0)).toBe(4);
  });

  it('returns -1 when from is at or past the last digit', () => {
    expect(findNextDigitPosition('12', 2)).toBe(-1);
    expect(findNextDigitPosition('12', 100)).toBe(-1);
  });
});

describe('isFormattingChar', () => {
  it('returns false for out-of-bounds index', () => {
    expect(isFormattingChar('123', -1)).toBe(false);
    expect(isFormattingChar('123', 3)).toBe(false);
    expect(isFormattingChar('', 0)).toBe(false);
  });

  it('returns false for digit characters', () => {
    expect(isFormattingChar('0', 0)).toBe(false);
    expect(isFormattingChar('9', 0)).toBe(false);
    expect(isFormattingChar('a5b', 1)).toBe(false);
  });

  it('returns true for non-digit characters', () => {
    expect(isFormattingChar('-', 0)).toBe(true);
    expect(isFormattingChar(' ', 0)).toBe(true);
    expect(isFormattingChar('(123)', 0)).toBe(true);
    expect(isFormattingChar('(123)', 4)).toBe(true);
  });
});
