import type { RegionListSort, RegionOption } from '../models';

function compareAlphabetical<T = undefined>(a: RegionOption<T>, b: RegionOption<T>): number {
  return a.displayName.localeCompare(b.displayName);
}

function compareCallingCode<T = undefined>(a: RegionOption<T>, b: RegionOption<T>): number {
  const codeDiff: number = a.callingCode.localeCompare(b.callingCode, undefined, { numeric: true });
  if (codeDiff !== 0) return codeDiff;
  return a.displayName.localeCompare(b.displayName);
}

export function resolveRegionListComparator<T = undefined>(
  sort: RegionListSort<T> | undefined,
): (a: RegionOption<T>, b: RegionOption<T>) => number {
  if (typeof sort === 'function') return sort;
  if (sort === 'callingCode') return compareCallingCode;
  return compareAlphabetical;
}
