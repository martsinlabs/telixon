import { getResourceProvider } from '@telixon/core/resource-provider';
import { requireEngineReady } from '@telixon/core/utils/require-engine-ready';
import { toInputString } from '@telixon/core/utils/to-input-string';
import { ResolvedNumberState, resolveNumber } from '../number-resolver/resolve-number';
import { createPhoneNumber, PhoneNumber, toResolvedPhoneNumber } from '../phone-number';
import { ParsePhoneNumberOptions } from './models';
import { extractPossibleNumber } from './utils/extract-possible-number';
import { stripExtension } from './utils/strip-extension';

// The index of the first plus or digit, or -1. ASCII checks match the resolver, which reads ASCII
// digits only.
function firstPlusOrDigitIndex(input: string): number {
  for (let index = 0; index < input.length; index++) {
    const code: number = input.charCodeAt(index);
    if ((code >= 0x30 && code <= 0x39) || code === 0x2b) return index;
  }
  return -1;
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
// One resolution pass detects extension-suspect characters as it walks; only an input carrying one
// takes the ported extract-and-strip machinery and a second resolution over the cleaned base.
export function parsePhoneNumber(input: string, options: ParsePhoneNumberOptions = {}): PhoneNumber {
  requireEngineReady();

  const safeInput: string = toInputString(input);
  const resourceProvider = getResourceProvider();
  const defaultRegionIndex: number =
    options.defaultRegion !== undefined ? (resourceProvider.regionKeyToIndex[options.defaultRegion] ?? -1) : -1;
  const strict: boolean = options.strict ?? false;

  const startIndex: number = firstPlusOrDigitIndex(safeInput);
  const hasLeadingPlus: boolean = startIndex !== -1 && safeInput.charCodeAt(startIndex) === 0x2b;
  const resolved: ResolvedNumberState = resolveNumber({
    input: safeInput,
    hasLeadingPlus,
    seedCallingCode: null,
    defaultRegionIndex,
    regionFilter: null,
    numberTypeFilter: null,
    strict,
    detectExtensionSuspect: true,
  });
  if (!resolved.extensionSuspect) {
    return createPhoneNumber(toResolvedPhoneNumber(resolved, defaultRegionIndex, null));
  }

  const extracted = extractPossibleNumber(safeInput);
  const { base, extension } = stripExtension(extracted.candidate);

  // The first resolution stands when the trims dropped no digit and the read mode is unchanged:
  // the walk ignores non-digits, so the cleaned base resolves to the same state.
  const baseHasLeadingPlus: boolean = base.charCodeAt(0) === 0x2b;
  if (extension === null && !extracted.secondNumberCut && baseHasLeadingPlus === hasLeadingPlus) {
    return createPhoneNumber(toResolvedPhoneNumber(resolved, defaultRegionIndex, null));
  }

  const rebased: ResolvedNumberState = resolveNumber({
    input: base,
    hasLeadingPlus: baseHasLeadingPlus,
    seedCallingCode: null,
    defaultRegionIndex,
    regionFilter: null,
    numberTypeFilter: null,
    strict,
  });
  return createPhoneNumber(toResolvedPhoneNumber(rebased, defaultRegionIndex, extension));
}
