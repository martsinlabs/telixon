import type { RegionListSort, RegionOption } from '../models';

// Region codes are unique ISO 3166-1 alpha-2 strings: a plain compare is a stable, locale-independent final tiebreak,
// so the comparators are total orders (equal display names never fall back to array-insertion order).
function compareRegion<T = undefined>(a: RegionOption<T>, b: RegionOption<T>): number {
  return a.region < b.region ? -1 : a.region > b.region ? 1 : 0;
}

// Collate display names in the list's own locale (not the host default), then break ties by region code.
function compareAlphabetical<T = undefined>(locale: string): (a: RegionOption<T>, b: RegionOption<T>) => number {
  return (a, b) => a.displayName.localeCompare(b.displayName, locale) || compareRegion(a, b);
}

function compareCallingCode<T = undefined>(locale: string): (a: RegionOption<T>, b: RegionOption<T>) => number {
  return (a, b) => {
    const codeDiff: number = a.callingCode.localeCompare(b.callingCode, undefined, { numeric: true });
    if (codeDiff !== 0) return codeDiff;
    return a.displayName.localeCompare(b.displayName, locale) || compareRegion(a, b);
  };
}

export function resolveRegionListComparator<T = undefined>(
  sort: RegionListSort<T> | undefined,
  locale: string,
): (a: RegionOption<T>, b: RegionOption<T>) => number {
  if (typeof sort === 'function') return sort;
  if (sort === 'callingCode') return compareCallingCode<T>(locale);
  return compareAlphabetical<T>(locale);
}
