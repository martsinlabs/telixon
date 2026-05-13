import { getCountryIndex, normalizeNationalNumber } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { describe, expect, it } from 'vitest';
import { NumberTypeProfileRef } from '../models';
import { NumberResolver } from '../number-resolver';
import { resolveFirstMatchingNumberTypeProfile } from '../resolve-first-matching-number-type-profile';

function createResolver(callingCode: string, nationalDigits: string): NumberResolver {
  const resolver = new NumberResolver();
  resolver.setCallingCode(callingCode);

  for (let i = 0; i < nationalDigits.length; i++) {
    resolver.advance(nationalDigits.charCodeAt(i) - 48);
  }

  return resolver;
}

function createNationalResolver(country: string, rawNationalDigits: string): NumberResolver {
  const resourceProvider = getResourceProvider();
  const countryIndex = resourceProvider.refMapping.countries.keyToIndex[country] ?? -1;
  const territorySpec = resourceProvider.territorySpecTable[countryIndex]!;
  const { normalizedDigits } = normalizeNationalNumber(rawNationalDigits, territorySpec);

  return createResolver(territorySpec.countryCode, normalizedDigits);
}

function resolveProfile(resolver: NumberResolver, preferredCountry: string): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();
  const preferredCountryIndex = resourceProvider.refMapping.countries.keyToIndex[preferredCountry] ?? -1;

  return resolveFirstMatchingNumberTypeProfile(
    resolver.snapshot,
    preferredCountryIndex,
    resolver.resolveLatestConcreteCountryIndex(),
  );
}

function getProfileCountry(profile: NumberTypeProfileRef): string {
  const resourceProvider = getResourceProvider();
  const countryIndex = getCountryIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);

  return resourceProvider.refMapping.countries.indexToKey[countryIndex]!;
}

function getProfileType(profile: NumberTypeProfileRef): string {
  const resourceProvider = getResourceProvider();
  const countryIndex = getCountryIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);
  const numberType = resourceProvider.territorySpecTable[countryIndex]!.numberTypes[profile.numberTypeIndex]!;

  return resourceProvider.refMapping.numberTypes[numberType.type]!;
}

function isGeneralDesc(profile: NumberTypeProfileRef): boolean {
  const resourceProvider = getResourceProvider();
  const countryIndex = getCountryIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);
  const generalDescType = resourceProvider.refMapping.numberTypes.length - 1;

  return (
    resourceProvider.territorySpecTable[countryIndex]!.numberTypes[profile.numberTypeIndex]!.type === generalDescType
  );
}

describe('resolveLatestConcreteCountryIndex', () => {
  it('keeps CA anchored while the 7-digit UAN length is still valid', () => {
    const resolver = createResolver('1', '3101234');
    const countryIndex = resolver.resolveLatestConcreteCountryIndex();

    expect(getResourceProvider().refMapping.countries.indexToKey[countryIndex]).toBe('CA');
  });

  it('drops CA anchor once the input grows past the 7-digit UAN length', () => {
    const resolver = createResolver('1', '31012344');
    const countryIndex = resolver.resolveLatestConcreteCountryIndex();

    expect(getResourceProvider().refMapping.countries.indexToKey[countryIndex]).not.toBe('CA');
  });
});

describe('resolveFirstMatchingNumberTypeProfile', () => {
  it('resolves AG from +1 268 even when preferred country is US', () => {
    const profile = resolveProfile(createResolver('1', '268'), 'US');

    expect(profile).not.toBeNull();
    expect(getProfileCountry(profile!)).toBe('AG');
  });

  it('prefers anchored concrete exact CA over preferred US generalDesc', () => {
    const profile = resolveProfile(createResolver('1', '3101234'), 'US');

    expect(profile).not.toBeNull();
    expect(getProfileCountry(profile!)).toBe('CA');
    expect(isGeneralDesc(profile!)).toBe(false);
  });

  it('does not return CA after the CA UAN anchor becomes too short', () => {
    const profile = resolveProfile(createResolver('1', '31012344'), 'US');

    expect(profile).not.toBeNull();
    expect(getProfileCountry(profile!)).not.toBe('CA');
  });

  it('resolves 0111523456789 as AR mobile', () => {
    const profile = resolveProfile(createNationalResolver('AR', '0111523456789'), 'AR');

    expect(profile).not.toBeNull();
    expect(getProfileCountry(profile!)).toBe('AR');
    expect(getProfileType(profile!)).toBe('mobile');
  });
});
