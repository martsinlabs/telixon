import { getResourceProvider } from '@telixon/core/resource-provider';
import { requireEngineReady } from '@telixon/core/utils/require-engine-ready';
import { ResolvedNumberState, resolveNumber } from '../number-resolver/resolve-number';
import { createPhoneNumber, PhoneNumber, toResolvedPhoneNumber } from '../phone-number';
import { ParsePhoneNumberOptions } from './models';

function isWhitespace(charCode: number): boolean {
  return charCode === 0x20 || charCode === 0x09 || charCode === 0x0a || charCode === 0x0d;
}

/**
 * Parses a phone number to validate, format, and inspect it. A leading `+` reads as international;
 * otherwise pass `defaultRegion`. Never throws on bad input: the returned {@link PhoneNumber} reports
 * why it is not valid.
 *
 * @param input - The number in any common notation. Spacing and punctuation are ignored.
 * @param options - `defaultRegion` for input without a `+`; `strict` to restrict validity to it.
 * @example
 * parsePhoneNumber('+1 (415) 555-0132').formatE164(); // '+14155550132'
 * parsePhoneNumber('(415) 555-0132', { defaultRegion: 'US' }).isValid(); // true
 */
// Detects the leading-plus flag, then defers to the shared resolveNumber pipeline (which ignores non-digits).
export function parsePhoneNumber(input: string, options: ParsePhoneNumberOptions = {}): PhoneNumber {
  requireEngineReady();

  const resourceProvider = getResourceProvider();
  const defaultRegionIndex: number =
    options.defaultRegion !== undefined ? (resourceProvider.regionKeyToIndex[options.defaultRegion] ?? -1) : -1;

  let index = 0;
  while (index < input.length && isWhitespace(input.charCodeAt(index))) index++;
  const hasLeadingPlus: boolean = index < input.length && input.charCodeAt(index) === 0x2b;

  const resolved: ResolvedNumberState = resolveNumber({
    input,
    hasLeadingPlus,
    seedCallingCode: null,
    defaultRegionIndex,
    regionFilter: null,
    numberTypeFilter: null,
    strict: options.strict ?? false,
  });

  return createPhoneNumber(toResolvedPhoneNumber(resolved, defaultRegionIndex));
}
