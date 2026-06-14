import { getMetadataRegionCallingCode, getRegionNationalPrefix } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { requireEngineReady } from '@telixon/core/utils/require-engine-ready';
import { NumberResolver } from '../number-resolver';
import { NumberResolverSnapshot } from '../number-resolver/models';
import { resolvePrimaryCountryIndex } from '../number-resolver/utils/resolve-primary-country-index';
import { createPhoneNumber, PhoneNumber, toResolvedPhoneNumber } from '../phone-number';
import { applyNationalPrefixStrip } from './apply-national-prefix-strip';
import { ParsePhoneNumberOptions } from './models';

let cachedResolver: NumberResolver | null = null;

function walkInputDigits(resolver: NumberResolver, input: string, fromIndex: number): void {
  for (let inputIndex = fromIndex; inputIndex < input.length; inputIndex++) {
    const charCode: number = input.charCodeAt(inputIndex);
    if (charCode >= 0x30 && charCode <= 0x39) resolver.advance(charCode - 48);
  }
}

// Parses a number into a PhoneNumber (no controller): '+' is international, else national via defaultCountry.
export function parsePhoneNumber(input: string, options: ParsePhoneNumberOptions = {}): PhoneNumber {
  requireEngineReady();

  const resourceProvider = getResourceProvider();
  const defaultCountryIndex: number =
    options.defaultCountry !== undefined ? (resourceProvider.regionKeyToIndex[options.defaultCountry] ?? -1) : -1;

  let bodyStartIndex = 0;
  while (bodyStartIndex < input.length) {
    const charCode: number = input.charCodeAt(bodyStartIndex);
    if (charCode !== 0x20 && charCode !== 0x09 && charCode !== 0x0a && charCode !== 0x0d) break;
    bodyStartIndex++;
  }

  const hasLeadingPlus: boolean = bodyStartIndex < input.length && input.charCodeAt(bodyStartIndex) === 0x2b;
  const readAsNational: boolean = !hasLeadingPlus && defaultCountryIndex !== -1;

  const resolver: NumberResolver = cachedResolver ?? (cachedResolver = new NumberResolver());
  resolver.setCountryFilter(null);
  resolver.setNumberTypeFilter(null);
  resolver.setStrict(false);

  if (readAsNational) {
    resolver.setCallingCode(String(getMetadataRegionCallingCode(resourceProvider.engine, defaultCountryIndex)));
    walkInputDigits(resolver, input, bodyStartIndex);
  } else {
    resolver.reset();
    walkInputDigits(resolver, input, hasLeadingPlus ? bodyStartIndex + 1 : bodyStartIndex);
  }

  // libphonenumber strips the national prefix on both forms: national input against the default country, international against the calling code's main region.
  const stripCountryIndex: number = readAsNational
    ? defaultCountryIndex
    : resolvePrimaryCountryIndex(resolver.callingCodeState, -1);
  const nationalDigits: string = resolver.getNationalNumber();
  const stripped: string | null = applyNationalPrefixStrip(
    nationalDigits,
    resolver.endState,
    resolver.callingCodeState,
    stripCountryIndex,
  );

  let nationalPrefixPresent: boolean = false;
  if (stripped !== null) {
    if (readAsNational) {
      const nationalPrefix: string | undefined = getRegionNationalPrefix(resourceProvider.engine, defaultCountryIndex);
      nationalPrefixPresent = !!nationalPrefix && nationalDigits.startsWith(nationalPrefix);
    }
    const callingCodeDigits: string = resolver.getCallingCode();
    resolver.setCallingCode(callingCodeDigits);
    walkInputDigits(resolver, stripped, 0);
  }

  const snapshot: NumberResolverSnapshot = resolver.snapshot;

  return createPhoneNumber(toResolvedPhoneNumber(snapshot, defaultCountryIndex, nationalPrefixPresent));
}
