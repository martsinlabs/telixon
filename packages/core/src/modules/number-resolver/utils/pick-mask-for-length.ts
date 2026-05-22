// Picks the display mask for an NSN of `length` from the engine's per-length masks. Falls back to the
// longest mask while the number is still being typed (a length with no exact entry yet).
export function pickMaskForLength(byLength: Record<number, string> | undefined, length: number): string | undefined {
  if (!byLength) return undefined;

  const exact: string | undefined = byLength[length];
  if (exact !== undefined) return exact;

  let longest: string | undefined;
  let longestLength = -1;
  for (const key in byLength) {
    const candidate = Number(key);
    if (candidate > longestLength) {
      longestLength = candidate;
      longest = byLength[key];
    }
  }
  return longest;
}
