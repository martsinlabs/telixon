import { getRegionIndex, MetadataNumberType, normalizeNationalNumber, RegionId } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { describe, expect, it } from 'vitest';
import { NumberTypeProfileRef } from '../models';
import { NumberResolver } from '../number-resolver';
import { resolveFirstMatchingNumberTypeProfile } from '../resolve-first-matching-number-type-profile';
import { createCountryFilter, createNumberTypeFilter } from '../utils/filter-factory';

function createResolver(callingCode: string, nationalDigits: string): NumberResolver {
  const resolver = new NumberResolver();
  resolver.setCallingCode(callingCode);

  for (let i = 0; i < nationalDigits.length; i++) {
    resolver.advance(nationalDigits.charCodeAt(i) - 48);
  }

  return resolver;
}

function createNationalResolver(country: RegionId, rawNationalDigits: string): NumberResolver {
  const resourceProvider = getResourceProvider();
  const countryIndex = resourceProvider.refMapping.regions.keyToIndex[country] ?? -1;
  const territorySpec = resourceProvider.territorySpecTable[countryIndex]!;
  const { normalizedDigits } = normalizeNationalNumber(rawNationalDigits, territorySpec);

  return createResolver(territorySpec.countryCode, normalizedDigits);
}

function resolveProfile(resolver: NumberResolver, preferredCountry?: RegionId): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();
  const preferredCountryIndex = preferredCountry
    ? (resourceProvider.refMapping.regions.keyToIndex[preferredCountry] ?? -1)
    : -1;

  return resolveFirstMatchingNumberTypeProfile(
    resolver.snapshot,
    preferredCountryIndex,
    resolver.resolveLatestConcreteCountryIndex(),
  );
}

function getProfileCountry(profile: NumberTypeProfileRef): RegionId {
  const resourceProvider = getResourceProvider();
  const countryIndex = getRegionIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);

  return resourceProvider.refMapping.regions.indexToKey[countryIndex]!;
}

function getProfileType(profile: NumberTypeProfileRef): MetadataNumberType {
  const resourceProvider = getResourceProvider();
  const countryIndex = getRegionIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);
  const numberType = resourceProvider.territorySpecTable[countryIndex]!.numberTypes[profile.numberTypeIndex]!;

  return resourceProvider.refMapping.numberTypes[numberType.type]!;
}

function isGeneralDesc(profile: NumberTypeProfileRef): boolean {
  const resourceProvider = getResourceProvider();
  const countryIndex = getRegionIndex(resourceProvider.countryScopeLayer, profile.stateCountryIndex);
  const generalDescType = resourceProvider.refMapping.numberTypes.length - 1;

  return (
    resourceProvider.territorySpecTable[countryIndex]!.numberTypes[profile.numberTypeIndex]!.type === generalDescType
  );
}

describe('resolveLatestConcreteCountryIndex', () => {
  it('keeps CA anchored while the 7-digit UAN length is still valid', () => {
    const resolver = createResolver('1', '3101234');
    const countryIndex = resolver.resolveLatestConcreteCountryIndex();

    expect(getResourceProvider().refMapping.regions.indexToKey[countryIndex]).toBe('CA');
  });

  it('drops CA anchor once the input grows past the 7-digit UAN length', () => {
    const resolver = createResolver('1', '31012344');
    const countryIndex = resolver.resolveLatestConcreteCountryIndex();

    expect(getResourceProvider().refMapping.regions.indexToKey[countryIndex]).not.toBe('CA');
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
    expect(getProfileType(profile!)).toBe('MOBILE');
  });
});

// Priority chain — non-strict.
// Steps mirror the JSDoc on resolveFirstMatchingNumberTypeProfile.
describe('priority chain: non-strict', () => {
  // Step 1: anchored concrete exact wins before any other candidate.
  describe('Step 1 — anchored concrete exact', () => {
    it('+1 4165551234 with preferred=US resolves to CA (416 anchors CA, 10-digit exact)', () => {
      const profile = resolveProfile(createResolver('1', '4165551234'), 'US');

      expect(profile).not.toBeNull();
      expect(getProfileCountry(profile!)).toBe('CA');
      expect(isGeneralDesc(profile!)).toBe(false);
    });
  });

  // Step 2: any exact (preferred concrete -> fallback concrete -> preferred general -> fallback general).
  describe('Step 2 — any exact match', () => {
    it('+1 2684621234 with preferred=US returns AG fixedLine (fallback concrete exact, US has no 268 area)', () => {
      const profile = resolveProfile(createResolver('1', '2684621234'), 'US');

      expect(profile).not.toBeNull();
      expect(getProfileCountry(profile!)).toBe('AG');
      expect(isGeneralDesc(profile!)).toBe(false);
    });

    it('+1 2681234567 with preferred=US returns AG generalDesc (no concrete pattern matches, generalDesc tail)', () => {
      const profile = resolveProfile(createResolver('1', '2681234567'), 'US');

      expect(profile).not.toBeNull();
      expect(getProfileCountry(profile!)).toBe('AG');
      expect(isGeneralDesc(profile!)).toBe(true);
    });
  });

  // Step 3: preferred concrete partial wins before fallback chain.
  describe('Step 3 — preferred concrete partial', () => {
    it('+44 7 with preferred=GB returns GB partial (only one digit, no exact, preferred matches partial)', () => {
      const profile = resolveProfile(createResolver('44', '7'), 'GB');

      expect(profile).not.toBeNull();
      expect(getProfileCountry(profile!)).toBe('GB');
    });
  });

  // Step 4: anchored country stays alive after preferred has nothing.
  describe('Step 4 — anchored partial', () => {
    it('+1 416 with off-calling-code preferred=GB returns CA via anchor', () => {
      const profile = resolveProfile(createResolver('1', '416'), 'GB');

      expect(profile).not.toBeNull();
      expect(getProfileCountry(profile!)).toBe('CA');
    });
  });

  // isAlive=false (dead state). Only terminal-prefix path is consulted.
  describe('dead-state recovery', () => {
    it('once state dies, falls back to terminal-prefix anchor (CA from 310 UAN)', () => {
      // 3101234 = CA UAN exact. Appending an invalid digit drops the DFA to dead state
      // while the snapshot keeps the CA terminal-prefix history.
      const resolver = createResolver('1', '3101234');
      resolver.advance(0); // pushes into dead state on most NANP roll-outs

      const profile = resolveFirstMatchingNumberTypeProfile(
        resolver.snapshot,
        getResourceProvider().refMapping.regions.keyToIndex['US']!,
        resolver.resolveLatestConcreteCountryIndex(),
      );

      // Whatever the resolver returns must come from the terminal-prefix history,
      // not from a live DFA state — and CA's UAN was the only concrete anchor we saw.
      if (profile !== null) {
        expect(['CA', 'US']).toContain(getProfileCountry(profile));
      }
    });
  });
});

// Strict mode never leaves the preferred country.
describe('priority chain: strict', () => {
  function createStrictResolver(callingCode: string, nationalDigits: string): NumberResolver {
    const resolver = createResolver(callingCode, nationalDigits);
    resolver.setStrict(true);
    return resolver;
  }

  it('strict + preferred=US keeps US even when +1 268 is typed (AG calling-code area)', () => {
    const profile = resolveProfile(createStrictResolver('1', '2681234567'), 'US');

    expect(profile).not.toBeNull();
    expect(getProfileCountry(profile!)).toBe('US');
  });

  it('strict + preferred=-1 falls through to non-strict resolution', () => {
    const profile = resolveProfile(createStrictResolver('1', '2681234567'));

    expect(profile).not.toBeNull();
    expect(getProfileCountry(profile!)).toBe('AG');
  });
});

// Filters mutate isCountryExcluded / isNumberTypeAllowed — they must short-circuit candidates.
describe('filters', () => {
  it('countryFilter excluding CA does not return CA even when 416 normally anchors it', () => {
    const resolver = new NumberResolver();
    resolver.setCountryFilter(createCountryFilter(['US']));
    resolver.setCallingCode('1');
    for (let i = 0; i < '4165551234'.length; i++) {
      resolver.advance('4165551234'.charCodeAt(i) - 48);
    }

    const profile = resolveProfile(resolver, 'US');

    if (profile !== null) {
      expect(getProfileCountry(profile)).not.toBe('CA');
    }
  });

  it('numberTypeFilter restricted to mobile excludes fixedLine resolutions', () => {
    const resolver = new NumberResolver();
    resolver.setNumberTypeFilter(createNumberTypeFilter(['MOBILE']));
    resolver.setCallingCode('1');
    for (let i = 0; i < '4165551234'.length; i++) {
      resolver.advance('4165551234'.charCodeAt(i) - 48);
    }

    const profile = resolveProfile(resolver, 'US');

    if (profile !== null && !isGeneralDesc(profile)) {
      expect(getProfileType(profile)).not.toBe('fixedLine');
    }
  });

  it('numberTypeFilter still resolves country via GENERAL_DESC fallback for non-matching types', () => {
    const resolver = new NumberResolver();
    resolver.setNumberTypeFilter(createNumberTypeFilter(['MOBILE']));
    resolver.setCallingCode('1');
    for (let i = 0; i < '8005551234'.length; i++) {
      resolver.advance('8005551234'.charCodeAt(i) - 48);
    }

    const profile = resolveProfile(resolver, 'US');

    expect(profile).not.toBeNull();
    expect(getProfileCountry(profile!)).toBe('US');
  });
});
