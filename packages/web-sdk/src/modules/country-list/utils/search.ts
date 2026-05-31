import type { CountryOption } from '../models';

const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;

export function normalizeSearchText(input: string): string {
  return input.normalize('NFD').replace(DIACRITICS_PATTERN, '').toLowerCase().trim();
}

export function defaultSearch<T>(query: string, option: CountryOption<T>): boolean {
  const normalizedQuery: string = normalizeSearchText(query);

  if (normalizeSearchText(option.displayName).includes(normalizedQuery)) return true;
  if (normalizeSearchText(option.country).includes(normalizedQuery)) return true;

  const callingCodeQuery: string = normalizedQuery.startsWith('+') ? normalizedQuery.slice(1) : normalizedQuery;
  if (option.callingCode.includes(callingCodeQuery)) return true;

  return false;
}
