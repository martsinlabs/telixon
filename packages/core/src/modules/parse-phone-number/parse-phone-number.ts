import { normalizeNationalNumber, TerritorySpec } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { assertResourcesReady } from '@telixon/core/utils/assert-resources-ready';
import { NumberResolver } from '../number-resolver';
import { resolveFirstMatchingNumberTypeProfile } from '../number-resolver/resolve-first-matching-number-type-profile';
import { createPhoneNumber, PhoneNumber, toResolvedPhoneNumber } from '../phone-number';
import { ParsePhoneNumberOptions } from './models';

// Parses a number into a PhoneNumber (no controller): '+' is international, else national via defaultCountry.
export function parsePhoneNumber(input: string, options: ParsePhoneNumberOptions = {}): PhoneNumber {
  assertResourcesReady();

  const { refMapping, territorySpecTable } = getResourceProvider();
  const defaultCountryIndex: number =
    options.defaultCountry !== undefined ? (refMapping.regions.keyToIndex[options.defaultCountry] ?? -1) : -1;

  const digits: string = input.replace(/[^0-9]/g, '');
  const readAsNational: boolean = !input.trimStart().startsWith('+') && defaultCountryIndex !== -1;

  const resolver: NumberResolver = new NumberResolver();
  let resolvedDigits: string = digits;

  if (readAsNational) {
    const territorySpec: TerritorySpec = territorySpecTable[defaultCountryIndex]!;
    resolver.setCallingCode(territorySpec.countryCode);
    resolvedDigits = digits.length > 0 ? normalizeNationalNumber(digits, territorySpec).normalizedDigits : digits;
  } else {
    resolver.reset();
  }

  for (let i = 0; i < resolvedDigits.length; i++) {
    resolver.advance(resolvedDigits.charCodeAt(i) - 48);
  }

  const snapshot = resolver.snapshot;
  const profile = resolveFirstMatchingNumberTypeProfile(
    snapshot,
    defaultCountryIndex,
    resolver.resolveLatestConcreteCountryIndex(),
  );

  return createPhoneNumber(toResolvedPhoneNumber(snapshot, profile, defaultCountryIndex));
}
