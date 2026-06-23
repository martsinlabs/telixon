import {
  getMetadataRegionCallingCode,
  getRegionInternationalPrefix,
  getRegionNationalPrefix,
} from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { applyLeadingCountryCodeStrip } from './apply-leading-country-code-strip';
import { applyNationalPrefixStrip } from './apply-national-prefix-strip';
import { NumberResolverSnapshot } from './models';
import { NumberResolver } from './number-resolver';
import { resolvePrimaryCountryIndex } from './utils/resolve-primary-country-index';

// The single parse pipeline shared by parsePhoneNumber and the input controllers. Walks the raw input
// (non-digits ignored) and strips IDD prefix, redundant leading country code, and national prefix, so
// every caller resolves a number identically.

let cachedResolver: NumberResolver | null = null;

// Compiled IDD matcher per region: the prefix is fixed metadata, so memoize (referentially transparent).
const iddMatcherCache = new Map<number, RegExp | null>();
function getIddMatcher(regionIndex: number): RegExp | null {
  const cached: RegExp | null | undefined = iddMatcherCache.get(regionIndex);
  if (cached !== undefined) return cached;
  const internationalPrefix: string | undefined = getRegionInternationalPrefix(
    getResourceProvider().engine,
    regionIndex,
  );
  const matcher: RegExp | null = internationalPrefix === undefined ? null : new RegExp(`^(?:${internationalPrefix})`);
  iddMatcherCache.set(regionIndex, matcher);
  return matcher;
}

function collectDigits(input: string): string {
  let digits = '';
  for (let index = 0; index < input.length; index++) {
    const charCode: number = input.charCodeAt(index);
    if (charCode >= 0x30 && charCode <= 0x39) digits += input[index];
  }
  return digits;
}

// libphonenumber maybeStripInternationalPrefixAndNormalize: strip a leading IDD prefix and re-parse the
// remainder. Not an IDD when the next digit is '0' (a national trunk digit, not a code).
function stripIddPrefix(digits: string, matcher: RegExp): string | null {
  const match: RegExpExecArray | null = matcher.exec(digits);
  if (match === null || match[0].length === 0) return null;
  const end: number = match[0].length;
  if (digits.charCodeAt(end) === 0x30) return null;
  return digits.slice(end);
}

function walkInput(resolver: NumberResolver, input: string): void {
  for (let index = 0; index < input.length; index++) {
    const charCode: number = input.charCodeAt(index);
    if (charCode >= 0x30 && charCode <= 0x39) resolver.advance(charCode - 48);
  }
}

export interface ResolveNumberInput {
  // Raw string; whitespace, '+', and formatting characters are ignored.
  readonly input: string;
  // International input (had a leading '+', or an international controller); national otherwise.
  readonly hasLeadingPlus: boolean;
  readonly defaultCountryIndex: number;
  readonly countryFilter: BinaryFilter | null;
  readonly numberTypeFilter: BinaryFilter | null;
  readonly strict: boolean;
}

export interface ResolvedNumberState {
  readonly snapshot: NumberResolverSnapshot;
  readonly nationalPrefixPresent: boolean;
}

export function resolveNumber(params: ResolveNumberInput): ResolvedNumberState {
  const { input, hasLeadingPlus, defaultCountryIndex, countryFilter, numberTypeFilter, strict } = params;
  const resourceProvider = getResourceProvider();

  // National-mode digits beginning with the region's IDD prefix are internationally dialled: strip the
  // prefix and parse the remainder as international (libphonenumber FROM_NUMBER_WITH_IDD).
  let iddRemainder: string | null = null;
  if (!hasLeadingPlus && defaultCountryIndex !== -1) {
    const matcher: RegExp | null = getIddMatcher(defaultCountryIndex);
    if (matcher !== null) iddRemainder = stripIddPrefix(collectDigits(input), matcher);
  }

  const readAsNational: boolean = !hasLeadingPlus && defaultCountryIndex !== -1 && iddRemainder === null;

  const resolver: NumberResolver = cachedResolver ?? (cachedResolver = new NumberResolver());
  resolver.setCountryFilter(countryFilter);
  resolver.setNumberTypeFilter(numberTypeFilter);
  resolver.setStrict(strict);

  // True once a redundant leading country code is dropped: from then on the number behaves as if dialled
  // through that calling code, so the strip below uses its main region instead of the default country.
  let leadingCountryCodeStripped = false;
  if (readAsNational) {
    const callingCode: string = String(getMetadataRegionCallingCode(resourceProvider.engine, defaultCountryIndex));
    resolver.setCallingCode(callingCode);
    walkInput(resolver, input);

    // National digits that redundantly begin with the country's own calling code: drop it and re-walk.
    // The national-prefix strip still runs below, matching libphonenumber's second pass in parseHelper.
    const leadingStripped: string | null = applyLeadingCountryCodeStrip(
      resolver.getNationalNumber(),
      resolver.callingCodeState,
      callingCode,
      defaultCountryIndex,
    );
    if (leadingStripped !== null) {
      resolver.setCallingCode(callingCode);
      walkInput(resolver, leadingStripped);
      leadingCountryCodeStripped = true;
    }
  } else {
    resolver.reset();
    walkInput(resolver, iddRemainder !== null ? iddRemainder : input);
  }

  // Strip the national prefix against the default country - but once a leading country code is extracted
  // (or the input is international), against that calling code's main region (libphonenumber's region
  // switch in maybeExtractCountryCode). An incomplete '+' calling code has no region, so no strip.
  const callingCodeUsable: boolean = readAsNational || resolver.callingCodeCompleted;
  const stripCountryIndex: number =
    readAsNational && !leadingCountryCodeStripped
      ? defaultCountryIndex
      : resolvePrimaryCountryIndex(resolver.callingCodeState, defaultCountryIndex);
  const nationalDigits: string = resolver.getNationalNumber();
  const stripped: string | null = callingCodeUsable
    ? applyNationalPrefixStrip(nationalDigits, resolver.endState, resolver.callingCodeState, stripCountryIndex)
    : null;

  let nationalPrefixPresent = false;
  if (stripped !== null) {
    if (readAsNational) {
      const nationalPrefix: string | undefined = getRegionNationalPrefix(resourceProvider.engine, defaultCountryIndex);
      nationalPrefixPresent = !!nationalPrefix && nationalDigits.startsWith(nationalPrefix);
    }
    const callingCodeDigits: string = resolver.getCallingCode();
    resolver.setCallingCode(callingCodeDigits);
    walkInput(resolver, stripped);
  }

  return { snapshot: resolver.snapshot, nationalPrefixPresent };
}
