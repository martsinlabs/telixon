import type { RegionOption } from '../models';

const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;

// Memoized: defaultSearch re-normalizes the same ~250 display names and region codes on every keystroke.
const normalizedCache = new Map<string, string>();

function normalizeSearchText(input: string): string {
  const cached: string | undefined = normalizedCache.get(input);
  if (cached !== undefined) return cached;
  const normalized: string = input.normalize('NFD').replace(DIACRITICS_PATTERN, '').toLowerCase().trim();
  normalizedCache.set(input, normalized);
  return normalized;
}

export function defaultSearch<T = undefined>(query: string, option: RegionOption<T>): boolean {
  const normalizedQuery: string = normalizeSearchText(query);

  if (normalizeSearchText(option.displayName).includes(normalizedQuery)) return true;
  if (normalizeSearchText(option.region).includes(normalizedQuery)) return true;

  const callingCodeQuery: string = normalizedQuery.startsWith('+') ? normalizedQuery.slice(1) : normalizedQuery;
  if (option.callingCode.includes(callingCodeQuery)) return true;

  return false;
}
