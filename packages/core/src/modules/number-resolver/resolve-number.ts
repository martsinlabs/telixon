import {
  getMetadataRegionCallingCode,
  getRegionInternationalPrefix,
  getRegionNationalPrefix,
} from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { applyLeadingCallingCodeStrip } from './apply-leading-calling-code-strip';
import { applyNationalPrefixStrip } from './apply-national-prefix-strip';
import { NumberResolverSnapshot } from './models';
import { NumberResolver } from './number-resolver';
import { resolvePrimaryRegionIndex } from './utils/resolve-primary-region-index';

// The single parse pipeline shared by parsePhoneNumber and the input controllers. Walks the raw input
// (non-digits ignored) and strips IDD prefix, redundant leading calling code, and national prefix, so
// every caller resolves a number identically. A seeded calling code walks the input literally instead.

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

// Bench-only: reset the compiled IDD matcher memo so strict-cold scenarios measure true one-shot cost.
export function __clearIddMatcherCache(): void {
  iddMatcherCache.clear();
}

function collectDigits(input: string): string {
  let digits = '';
  for (let index = 0; index < input.length; index++) {
    const charCode: number = input.charCodeAt(index);
    if (charCode >= 0x30 && charCode <= 0x39) digits += input[index];
  }
  return digits;
}

interface CollectedDigits {
  readonly digits: string;
  readonly extensionSuspect: boolean;
}

// collectDigits with suspect detection fused into the same pass: a character beyond digits, '+',
// common format punctuation, and whitespace controls means parsePhoneNumber must run the ported
// extension machinery. The digit branch pays nothing; walkInputDetectingExtensionSuspect inlines the same checks.
function collectDigitsDetectingExtensionSuspect(input: string): CollectedDigits {
  let digits = '';
  let extensionSuspect = false;
  for (let index = 0; index < input.length; index++) {
    const charCode: number = input.charCodeAt(index);
    if (charCode >= 0x30 && charCode <= 0x39) {
      digits += input[index];
      continue;
    }
    if (extensionSuspect) continue;
    if (
      charCode === 0x20 ||
      charCode === 0x2b ||
      charCode === 0x2d ||
      charCode === 0x28 ||
      charCode === 0x29 ||
      charCode === 0x2e ||
      charCode === 0x2f ||
      charCode === 0x2a ||
      charCode === 0x3a ||
      (charCode >= 0x09 && charCode <= 0x0d)
    ) {
      continue;
    }
    extensionSuspect = true;
  }
  return { digits, extensionSuspect };
}

// libphonenumber maybeStripInternationalPrefixAndNormalize: strip a leading IDD prefix and re-parse the
// remainder. Not an IDD when the next digit is '0', the national trunk digit.
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

// walkInput with suspect detection fused into the same pass; the digit branch pays nothing and
// the checks stay inline so the advance call keeps its inlining.
// Only parsePhoneNumber's first raw read takes this variant.
function walkInputDetectingExtensionSuspect(resolver: NumberResolver, input: string): boolean {
  let extensionSuspect = false;
  for (let index = 0; index < input.length; index++) {
    const charCode: number = input.charCodeAt(index);
    if (charCode >= 0x30 && charCode <= 0x39) {
      resolver.advance(charCode - 48);
      continue;
    }
    if (extensionSuspect) continue;
    if (
      charCode === 0x20 ||
      charCode === 0x2b ||
      charCode === 0x2d ||
      charCode === 0x28 ||
      charCode === 0x29 ||
      charCode === 0x2e ||
      charCode === 0x2f ||
      charCode === 0x2a ||
      charCode === 0x3a ||
      (charCode >= 0x09 && charCode <= 0x0d)
    ) {
      continue;
    }
    extensionSuspect = true;
  }
  return extensionSuspect;
}

export interface ResolveNumberInput {
  // Raw string; whitespace, '+', and formatting characters are ignored.
  readonly input: string;
  // International input (had a leading '+', or an international controller); national otherwise.
  readonly hasLeadingPlus: boolean;
  // Calling code held outside the field: the input is the international significant number, walked literally with no parse leniency.
  readonly seedCallingCode: string | null;
  readonly defaultRegionIndex: number;
  readonly regionFilter: BinaryFilter | null;
  readonly numberTypeFilter: BinaryFilter | null;
  readonly strict: boolean;
  // parsePhoneNumber only: detect extension-suspect characters during the first raw read.
  readonly detectExtensionSuspect?: boolean;
}

export interface ResolvedNumberState {
  readonly snapshot: NumberResolverSnapshot;
  readonly nationalPrefixPresent: boolean;
  // National-mode input (no leading '+', resolved against the default region); national-prefix checks apply only then.
  readonly readAsNational: boolean;
  // The seeded literal read above; the national-prefix-present check applies only then.
  readonly callingCodeSeeded: boolean;
  // Set only under `detectExtensionSuspect`: the raw input carries a character the extension machinery must inspect.
  readonly extensionSuspect: boolean;
}

export function resolveNumber(params: ResolveNumberInput): ResolvedNumberState {
  const {
    input,
    hasLeadingPlus,
    seedCallingCode,
    defaultRegionIndex,
    regionFilter,
    numberTypeFilter,
    strict,
    detectExtensionSuspect = false,
  } = params;
  const resourceProvider = getResourceProvider();

  const resolver: NumberResolver = cachedResolver ?? (cachedResolver = new NumberResolver());
  resolver.setRegionFilter(regionFilter);
  resolver.setNumberTypeFilter(numberTypeFilter);
  resolver.setStrict(strict);

  // Suspect detection rides the first read over the raw string; every later walk is over digits.
  let extensionSuspect = false;
  let rawReadDone = false;

  if (seedCallingCode !== null) {
    resolver.setCallingCode(seedCallingCode);
    walkInput(resolver, input);
    return {
      snapshot: resolver.snapshot,
      nationalPrefixPresent: false,
      readAsNational: false,
      callingCodeSeeded: true,
      extensionSuspect: false,
    };
  }

  // National-mode digits beginning with the region's IDD prefix are internationally dialed: strip the
  // prefix and parse the remainder as international (libphonenumber FROM_NUMBER_WITH_IDD).
  let iddRemainder: string | null = null;
  let rawDigits: string | null = null;
  if (!hasLeadingPlus && defaultRegionIndex !== -1) {
    const matcher: RegExp | null = getIddMatcher(defaultRegionIndex);
    if (matcher !== null) {
      if (detectExtensionSuspect) {
        const collected: CollectedDigits = collectDigitsDetectingExtensionSuspect(input);
        extensionSuspect = collected.extensionSuspect;
        rawReadDone = true;
        rawDigits = collected.digits;
      } else {
        rawDigits = collectDigits(input);
      }
      iddRemainder = stripIddPrefix(rawDigits, matcher);
    }
  }

  const readAsNational: boolean = !hasLeadingPlus && defaultRegionIndex !== -1 && iddRemainder === null;

  // True once a redundant leading calling code is dropped: from then on the number behaves as if dialed
  // through that calling code, so the strip below prefers its main region over the default region.
  let leadingCallingCodeStripped = false;
  if (readAsNational) {
    const callingCode: string = String(getMetadataRegionCallingCode(resourceProvider.engine, defaultRegionIndex));
    resolver.setCallingCode(callingCode);
    if (detectExtensionSuspect && !rawReadDone) {
      extensionSuspect = walkInputDetectingExtensionSuspect(resolver, input);
    } else {
      // The digits collected for the IDD check walk directly; the raw string is never rescanned.
      walkInput(resolver, rawDigits ?? input);
    }

    // National digits that redundantly begin with the region's own calling code: drop it and re-walk.
    // The national-prefix strip still runs below, matching libphonenumber's second pass in parseHelper.
    const leadingStripped: string | null = applyLeadingCallingCodeStrip(
      resolver.getNationalNumber(),
      resolver.callingCodeState,
      callingCode,
      defaultRegionIndex,
    );
    if (leadingStripped !== null) {
      resolver.setCallingCode(callingCode);
      walkInput(resolver, leadingStripped);
      leadingCallingCodeStripped = true;
    }
  } else {
    resolver.reset();
    const walkTarget: string = iddRemainder !== null ? iddRemainder : input;
    if (detectExtensionSuspect && !rawReadDone) {
      extensionSuspect = walkInputDetectingExtensionSuspect(resolver, walkTarget);
    } else {
      walkInput(resolver, walkTarget);
    }
  }

  // Strip the national prefix against the default region - but once a leading calling code is extracted
  // (or the input is international), against that calling code's main region (libphonenumber's region
  // switch in maybeExtractCountryCode). An incomplete '+' calling code has no region, so no strip.
  const callingCodeUsable: boolean = readAsNational || resolver.callingCodeCompleted;
  const stripRegionIndex: number =
    readAsNational && !leadingCallingCodeStripped
      ? defaultRegionIndex
      : resolvePrimaryRegionIndex(resolver.callingCodeState, defaultRegionIndex);
  const nationalDigits: string = resolver.getNationalNumber();
  const stripped: string | null = callingCodeUsable
    ? applyNationalPrefixStrip(nationalDigits, resolver.endState, resolver.callingCodeState, stripRegionIndex)
    : null;

  let nationalPrefixPresent = false;
  if (stripped !== null) {
    if (readAsNational) {
      const nationalPrefix: string | undefined = getRegionNationalPrefix(resourceProvider.engine, defaultRegionIndex);
      nationalPrefixPresent = !!nationalPrefix && nationalDigits.startsWith(nationalPrefix);
    }
    const callingCodeDigits: string = resolver.getCallingCode();
    resolver.setCallingCode(callingCodeDigits);
    walkInput(resolver, stripped);
  }

  return {
    snapshot: resolver.snapshot,
    nationalPrefixPresent,
    readAsNational,
    callingCodeSeeded: false,
    extensionSuspect,
  };
}
