import type { CountryListSort, CountryOption } from '../models';

function compareAlphabetical<T>(a: CountryOption<T>, b: CountryOption<T>): number {
  return a.displayName.localeCompare(b.displayName);
}

function compareCallingCode<T>(a: CountryOption<T>, b: CountryOption<T>): number {
  const codeDiff: number = a.callingCode.localeCompare(b.callingCode, undefined, { numeric: true });
  if (codeDiff !== 0) return codeDiff;
  return a.displayName.localeCompare(b.displayName);
}

export function resolveCountryListComparator<T>(
  sort: CountryListSort<T> | undefined,
): (a: CountryOption<T>, b: CountryOption<T>) => number {
  if (typeof sort === 'function') return sort;
  if (sort === 'callingCode') return compareCallingCode;
  return compareAlphabetical;
}
