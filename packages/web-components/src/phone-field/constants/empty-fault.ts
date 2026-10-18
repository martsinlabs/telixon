import type { ValidationError } from '@telixon/core';

/** The fault a required field reports while it holds no digits. */
export const EMPTY_FAULT: ValidationError = Object.freeze({ kind: 'EMPTY' });
