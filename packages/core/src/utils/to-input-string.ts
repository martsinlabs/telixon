/**
 * Coerces an untyped runtime value to the string the input pipeline expects. TypeScript callers
 * always pass strings; plain JavaScript callers can pass anything, and the documented contract is
 * that bad input degrades to a verdict instead of throwing.
 */
export function toInputString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  return String(value);
}
