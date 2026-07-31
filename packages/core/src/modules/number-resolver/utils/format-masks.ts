import { forEachFormatMask, getFormatMask } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getProcessScopedCache } from '@telixon/core/utils/get-process-scoped-cache';

// Per-call mask reads decode from the binary; the per-keystroke variant/longest scans are memoized
// (immutable after load). Process-scoped, so every bundled copy of this module shares the memos.
const NO_MASK = '';
const exactMaskCache = getProcessScopedCache('exactFormatMasks', () => new Map<number, string>());
const longestMaskCache = getProcessScopedCache('longestFormatMasks', () => new Map<number, string>());

function exactKey(formatIndex: number, variant: number, totalLength: number): number {
  return formatIndex * 128 + variant * 32 + totalLength;
}

function longestKey(formatIndex: number, variant: number): number {
  return formatIndex * 4 + variant;
}

function getExactFormatMask(formatIndex: number, variant: number, totalLength: number): string {
  const key: number = exactKey(formatIndex, variant, totalLength);
  let mask: string | undefined = exactMaskCache.get(key);
  if (mask === undefined) {
    mask = getFormatMask(getResourceProvider().engine, formatIndex, variant, totalLength) ?? NO_MASK;
    exactMaskCache.set(key, mask);
  }
  return mask;
}

function getLongestFormatMask(formatIndex: number, variant: number): string {
  const key: number = longestKey(formatIndex, variant);
  let mask: string | undefined = longestMaskCache.get(key);
  if (mask === undefined) {
    const { engine } = getResourceProvider();
    let longestLength = -1;
    let longestMask: string = NO_MASK;
    forEachFormatMask(engine, formatIndex, variant, (totalLength: number, entryMask: string) => {
      if (totalLength > longestLength) {
        longestLength = totalLength;
        longestMask = entryMask;
      }
    });
    mask = longestMask;
    longestMaskCache.set(key, mask);
  }
  return mask;
}

// True when the format carries any mask for the variant.
export function hasMaskVariant(formatIndex: number, variant: number): boolean {
  return getLongestFormatMask(formatIndex, variant) !== NO_MASK;
}

// Display mask for an NSN of `totalLength`, else the variant's longest mask while still typing (no exact entry yet).
export function pickFormatMask(formatIndex: number, variant: number, totalLength: number): string | undefined {
  const exact: string = getExactFormatMask(formatIndex, variant, totalLength);
  if (exact !== NO_MASK) return exact;
  const longest: string = getLongestFormatMask(formatIndex, variant);
  return longest === NO_MASK ? undefined : longest;
}

export function __clearFormatMaskCaches(): void {
  exactMaskCache.clear();
  longestMaskCache.clear();
}
