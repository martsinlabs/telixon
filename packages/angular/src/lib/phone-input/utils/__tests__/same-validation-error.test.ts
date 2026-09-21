import { describe, expect, it } from 'vitest';
import { sameValidationError } from '../same-validation-error';

describe('sameValidationError', () => {
  it('matches two absent errors and tells an absent one from a present one', () => {
    expect(sameValidationError(null, null)).toBe(true);
    expect(sameValidationError(null, { kind: 'PATTERN_MISMATCH' })).toBe(false);
    expect(sameValidationError({ kind: 'PATTERN_MISMATCH' }, null)).toBe(false);
  });

  it('compares the kind and every detail', () => {
    expect(sameValidationError({ kind: 'TOO_SHORT', minLength: 10 }, { kind: 'TOO_SHORT', minLength: 10 })).toBe(true);
    expect(sameValidationError({ kind: 'TOO_SHORT', minLength: 10 }, { kind: 'TOO_SHORT', minLength: 7 })).toBe(false);
    expect(sameValidationError({ kind: 'TOO_SHORT', minLength: 10 }, { kind: 'TOO_LONG', maxLength: 10 })).toBe(false);
  });

  it('compares list details element by element', () => {
    const lengths = { kind: 'INVALID_LENGTH', possibleLengths: [7, 10] } as const;

    expect(sameValidationError(lengths, { kind: 'INVALID_LENGTH', possibleLengths: [7, 10] })).toBe(true);
    expect(sameValidationError(lengths, { kind: 'INVALID_LENGTH', possibleLengths: [7, 11] })).toBe(false);
    expect(sameValidationError(lengths, { kind: 'INVALID_LENGTH', possibleLengths: [7] })).toBe(false);
  });
});
