import { normalizeNationalNumber, TerritorySpec } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { assertResourcesReady } from '@telixon/core/utils/assert-resources-ready';
import { NumberResolver } from '../number-resolver';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../number-resolver/models';
import { resolveFirstMatchingNumberTypeProfile } from '../number-resolver/resolve-first-matching-number-type-profile';
import { createPhoneNumber, PhoneNumber, toResolvedPhoneNumber } from '../phone-number';
import { ParsePhoneNumberOptions } from './models';

let cachedResolver: NumberResolver | null = null;

// Parses a number into a PhoneNumber (no controller): '+' is international, else national via defaultCountry.
export function parsePhoneNumber(input: string, options: ParsePhoneNumberOptions = {}): PhoneNumber {
  assertResourcesReady();

  const { refMapping, territorySpecTable } = getResourceProvider();
  const defaultCountryIndex: number =
    options.defaultCountry !== undefined ? (refMapping.regions.keyToIndex[options.defaultCountry] ?? -1) : -1;

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
  let nationalPrefixPresent: boolean = false;

  if (readAsNational) {
    let nationalDigits = '';

    for (let inputIndex = bodyStartIndex; inputIndex < input.length; inputIndex++) {
      const charCode: number = input.charCodeAt(inputIndex);
      if (charCode >= 0x30 && charCode <= 0x39) {
        nationalDigits += String.fromCharCode(charCode);
      }
    }

    const territorySpec: TerritorySpec = territorySpecTable[defaultCountryIndex]!;
    resolver.setCallingCode(territorySpec.countryCode);
    const normalizedDigits: string =
      nationalDigits.length > 0
        ? normalizeNationalNumber(nationalDigits, territorySpec).normalizedDigits
        : nationalDigits;

    nationalPrefixPresent = !!territorySpec.nationalPrefix && nationalDigits.startsWith(territorySpec.nationalPrefix);

    for (let digitIndex = 0; digitIndex < normalizedDigits.length; digitIndex++) {
      resolver.advance(normalizedDigits.charCodeAt(digitIndex) - 48);
    }
  } else {
    resolver.reset();
    const firstDigitIndex: number = hasLeadingPlus ? bodyStartIndex + 1 : bodyStartIndex;

    for (let inputIndex = firstDigitIndex; inputIndex < input.length; inputIndex++) {
      const charCode: number = input.charCodeAt(inputIndex);
      if (charCode >= 0x30 && charCode <= 0x39) resolver.advance(charCode - 48);
    }
  }

  const snapshot: NumberResolverSnapshot = resolver.snapshot;
  const profile: NumberTypeProfileRef | null = resolveFirstMatchingNumberTypeProfile(
    snapshot,
    defaultCountryIndex,
    resolver.resolveLatestConcreteCountryIndex(snapshot),
  );

  return createPhoneNumber(toResolvedPhoneNumber(snapshot, profile, defaultCountryIndex, nationalPrefixPresent));
}
