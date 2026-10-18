/** The entries of a comma-separated attribute, trimmed, without the empty ones. */
export function listAttribute(value: string | null): readonly string[] {
  if (value === null) return [];
  return value
    .split(',')
    .map((entry: string): string => entry.trim())
    .filter((entry: string): boolean => entry !== '');
}
