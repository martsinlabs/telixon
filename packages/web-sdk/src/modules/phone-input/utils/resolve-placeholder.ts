import type { NumberType, RegionCode } from '@telixon/core';
import { getCallingCodeForRegion, getPlaceholders, isNationalPrefixOptional } from '@telixon/core';
import type { PhoneInputOptions } from '../models';

/** Placeholder-relevant subset of `PhoneInputOptions`, captured at construction. */
export type PlaceholderConfig = { numberType: NumberType } & (
  | { mode: 'national' }
  | { mode: 'international'; callingCodeInInput: true; plusPrefix: boolean }
  | { mode: 'international'; callingCodeInInput: false }
);

/** Capture placeholder config from options; mirrors international default when `display` omitted. */
export function buildPlaceholderConfig(options: PhoneInputOptions): PlaceholderConfig {
  const numberType: NumberType = options.placeholderNumberType ?? 'MOBILE';

  if (options.mode === 'national') return { mode: 'national', numberType };

  const display = options.display;

  if (display === undefined) {
    return { mode: 'international', callingCodeInInput: true, plusPrefix: false, numberType };
  }

  if (display.callingCodeInInput === false) {
    return { mode: 'international', callingCodeInInput: false, numberType };
  }

  return { mode: 'international', callingCodeInInput: true, plusPrefix: display.plusPrefix !== 'none', numberType };
}

/** Compute the placeholder string for `(region, config)`, or `null` if unresolved. */
export function resolvePlaceholder(region: RegionCode | null, config: PlaceholderConfig): string | null {
  if (region === null) return null;

  const placeholders = getPlaceholders(region, config.numberType);
  if (placeholders === null) return null;

  if (config.mode === 'national') {
    return isNationalPrefixOptional(region, config.numberType)
      ? (placeholders.national ?? placeholders.nationalWithPrefix ?? null)
      : (placeholders.nationalWithPrefix ?? placeholders.national ?? null);
  }

  if (config.callingCodeInInput === false) {
    return placeholders.international ?? null;
  }

  if (placeholders.international === undefined) return null;
  const callingCode: string = getCallingCodeForRegion(region);

  return config.plusPrefix
    ? '+' + callingCode + ' ' + placeholders.international
    : callingCode + ' ' + placeholders.international;
}
