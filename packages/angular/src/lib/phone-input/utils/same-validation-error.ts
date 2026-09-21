import type { ValidationError } from '@telixon/core';

function sameField(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return Object.is(a, b);
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) if (!Object.is(a[index], b[index])) return false;
  return true;
}

/** Whether two validation errors carry the same kind and the same details. */
export function sameValidationError(a: ValidationError | null, b: ValidationError | null): boolean {
  if (a === b) return true;
  if (a === null || b === null || a.kind !== b.kind) return false;
  const fieldsOfA: Readonly<Record<string, unknown>> = a;
  const fieldsOfB: Readonly<Record<string, unknown>> = b;
  return Object.keys(fieldsOfA).every((key) => sameField(fieldsOfA[key], fieldsOfB[key]));
}
