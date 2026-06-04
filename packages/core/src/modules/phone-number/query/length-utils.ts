import { forEachLength } from '@telixon/core/engine';

/** Lowest set length bit in the mask, or 0 when the mask is empty. */
export function getMinLength(mask: number): number {
  if (mask === 0) return 0;
  return Math.log2(mask & -mask);
}

/** Ascending list of every length encoded in the mask. */
export function getPossibleLengths(mask: number): readonly number[] {
  const lengths: number[] = [];
  forEachLength(mask, (length: number) => {
    lengths.push(length);
  });
  return lengths;
}
