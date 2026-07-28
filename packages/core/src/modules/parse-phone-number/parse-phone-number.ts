import { getResourceProvider } from '@telixon/core/resource-provider';
import { requireEngineReady } from '@telixon/core/utils/require-engine-ready';
import { ResolvedNumberState, resolveNumber } from '../number-resolver/resolve-number';
import { createPhoneNumber, PhoneNumber, toResolvedPhoneNumber } from '../phone-number';
import { ParsePhoneNumberOptions } from './models';
import { extractPossibleNumber } from './utils/extract-possible-number';
import { stripExtension } from './utils/strip-extension';

// Any character beyond digits, `+`, and plain number punctuation calls for the full
// extract-and-strip treatment; a single native class test keeps the gate off the JS per-character
// path. The slow path resolves identically and may only do extra trimming work.
const NON_PLAIN_INPUT_PATTERN = /[^0-9+\-(). /*:\t-\r]/;

// The index of the first plus or digit, or -1. ASCII checks suffice; the gate above routes any
// other character to the slow path.
function firstPlusOrDigitIndex(input: string): number {
  for (let index = 0; index < input.length; index++) {
    const code: number = input.charCodeAt(index);
    if ((code >= 0x30 && code <= 0x39) || code === 0x2b) return index;
  }
  return -1;
}

interface PreparedInput {
  readonly base: string;
  readonly extension: string | null;
  readonly hasLeadingPlus: boolean;
}

// Both branches read the leading plus off the first plus or digit, the position libphonenumber's
// extractPossibleNumber would cut to.
function prepareInput(input: string): PreparedInput {
  if (NON_PLAIN_INPUT_PATTERN.test(input)) {
    const { base, extension } = stripExtension(extractPossibleNumber(input));
    return { base, extension, hasLeadingPlus: base.charCodeAt(0) === 0x2b };
  }

  const startIndex: number = firstPlusOrDigitIndex(input);
  return {
    base: input,
    extension: null,
    hasLeadingPlus: startIndex !== -1 && input.charCodeAt(startIndex) === 0x2b,
  };
}

/**
 * Parses a phone number to validate, format, and inspect it. A leading `+` reads as international;
 * otherwise pass `defaultRegion`. Never throws on bad input: the returned {@link PhoneNumber} reports
 * why it is not valid.
 *
 * @param input - The number in any common notation. Spacing and punctuation are ignored; a trailing
 * extension (`ext.`, `x`, `;ext=`, and similar notations) is captured.
 * @param options - `defaultRegion` for input without a `+`; `strict` to restrict validity to it.
 * @example
 * parsePhoneNumber('+1 (415) 555-0132').formatE164(); // '+14155550132'
 * parsePhoneNumber('(415) 555-0132', { defaultRegion: 'US' }).isValid(); // true
 */
// Trims to the candidate number, splits off a trailing extension, detects the leading-plus flag,
// then defers to the shared resolveNumber pipeline (which ignores non-digits).
export function parsePhoneNumber(input: string, options: ParsePhoneNumberOptions = {}): PhoneNumber {
  requireEngineReady();

  const resourceProvider = getResourceProvider();
  const defaultRegionIndex: number =
    options.defaultRegion !== undefined ? (resourceProvider.regionKeyToIndex[options.defaultRegion] ?? -1) : -1;

  const { base, extension, hasLeadingPlus } = prepareInput(input);

  const resolved: ResolvedNumberState = resolveNumber({
    input: base,
    hasLeadingPlus,
    seedCallingCode: null,
    defaultRegionIndex,
    regionFilter: null,
    numberTypeFilter: null,
    strict: options.strict ?? false,
  });

  return createPhoneNumber(toResolvedPhoneNumber(resolved, defaultRegionIndex, extension));
}
