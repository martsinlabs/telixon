import {
  getMetadataRegionCallingCode,
  getRegionTypeId,
  MetadataNumberType,
  normalizeNationalNumber,
  RegionCode,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { describe, expect, it } from 'vitest';
import { NumberTypeProfileRef } from '../models';
import { NumberResolver } from '../number-resolver';
import { resolveLatestConcreteRegionIndex, resolveProfile as resolveProfileRef } from '../resolve-profile';
import { createNumberTypeFilter, createRegionFilter } from '../utils/filter-factory';
import { getNationalPrefixRules } from '../utils/get-national-prefix-rules';

function createResolver(callingCode: string, nationalDigits: string): NumberResolver {
  const resolver = new NumberResolver();
  resolver.setCallingCode(callingCode);

  for (let i = 0; i < nationalDigits.length; i++) {
    resolver.advance(nationalDigits.charCodeAt(i) - 48);
  }

  return resolver;
}

function createNationalResolver(region: RegionCode, rawNationalDigits: string): NumberResolver {
  const resourceProvider = getResourceProvider();
  const regionIndex = resourceProvider.regionKeyToIndex[region] ?? -1;
  const prefixRules = getNationalPrefixRules(regionIndex)!;
  const { normalizedDigits } = normalizeNationalNumber(rawNationalDigits, prefixRules);

  return createResolver(String(getMetadataRegionCallingCode(resourceProvider.engine, regionIndex)), normalizedDigits);
}

function resolveProfile(resolver: NumberResolver, preferredRegion?: RegionCode): NumberTypeProfileRef | null {
  const resourceProvider = getResourceProvider();
  const preferredRegionIndex = preferredRegion ? (resourceProvider.regionKeyToIndex[preferredRegion] ?? -1) : -1;

  return resolveProfileRef(resolver.snapshot, preferredRegionIndex);
}

function getProfileRegion(profile: NumberTypeProfileRef): RegionCode {
  return getResourceProvider().regionIds[profile.regionIndex]!;
}

function getProfileType(profile: NumberTypeProfileRef): MetadataNumberType {
  const resourceProvider = getResourceProvider();
  const typeId = getRegionTypeId(resourceProvider.engine, profile.regionIndex, profile.numberTypeIndex);

  return resourceProvider.numberTypeNames[typeId]!;
}

function isGeneralDesc(profile: NumberTypeProfileRef): boolean {
  const resourceProvider = getResourceProvider();
  const generalDescType = resourceProvider.numberTypeNames.length - 1;

  return getRegionTypeId(resourceProvider.engine, profile.regionIndex, profile.numberTypeIndex) === generalDescType;
}

describe('resolveLatestConcreteRegionIndex', () => {
  it('keeps CA anchored while the 7-digit UAN length is still valid', () => {
    const resolver = createResolver('1', '3101234');
    const regionIndex = resolveLatestConcreteRegionIndex(resolver.snapshot);

    expect(getResourceProvider().regionIds[regionIndex]).toBe('CA');
  });

  it('drops CA anchor once the input grows past the 7-digit UAN length', () => {
    const resolver = createResolver('1', '31012344');
    const regionIndex = resolveLatestConcreteRegionIndex(resolver.snapshot);

    expect(getResourceProvider().regionIds[regionIndex]).not.toBe('CA');
  });
});

describe('resolveProfile', () => {
  it('resolves AG from +1 268 even when preferred region is US', () => {
    const profile = resolveProfile(createResolver('1', '268'), 'US');

    expect(profile).not.toBeNull();
    expect(getProfileRegion(profile!)).toBe('AG');
  });

  it('prefers anchored concrete exact CA over preferred US generalDesc', () => {
    const profile = resolveProfile(createResolver('1', '3101234'), 'US');

    expect(profile).not.toBeNull();
    expect(getProfileRegion(profile!)).toBe('CA');
    expect(isGeneralDesc(profile!)).toBe(false);
  });

  it('does not return CA after the CA UAN anchor becomes too short', () => {
    const profile = resolveProfile(createResolver('1', '31012344'), 'US');

    expect(profile).not.toBeNull();
    expect(getProfileRegion(profile!)).not.toBe('CA');
  });

  it('resolves 0111523456789 as AR mobile', () => {
    const profile = resolveProfile(createNationalResolver('AR', '0111523456789'), 'AR');

    expect(profile).not.toBeNull();
    expect(getProfileRegion(profile!)).toBe('AR');
    expect(getProfileType(profile!)).toBe('MOBILE');
  });
});

// Priority chain (non-strict): steps mirror the JSDoc on resolveProfile.
describe('priority chain: non-strict', () => {
  // Step 1: anchored concrete exact wins before any other candidate.
  describe('Step 1: anchored concrete exact', () => {
    it('+1 4165551234 with preferred=US resolves to CA (416 anchors CA, 10-digit exact)', () => {
      const profile = resolveProfile(createResolver('1', '4165551234'), 'US');

      expect(profile).not.toBeNull();
      expect(getProfileRegion(profile!)).toBe('CA');
      expect(isGeneralDesc(profile!)).toBe(false);
    });
  });

  // Step 2: any exact (preferred concrete -> fallback concrete -> preferred general -> fallback general).
  describe('Step 2: any exact match', () => {
    it('+1 2684621234 with preferred=US returns AG fixedLine (fallback concrete exact, US has no 268 area)', () => {
      const profile = resolveProfile(createResolver('1', '2684621234'), 'US');

      expect(profile).not.toBeNull();
      expect(getProfileRegion(profile!)).toBe('AG');
      expect(isGeneralDesc(profile!)).toBe(false);
    });

    it('+1 2681234567 with preferred=US returns AG generalDesc (no concrete pattern matches, generalDesc tail)', () => {
      const profile = resolveProfile(createResolver('1', '2681234567'), 'US');

      expect(profile).not.toBeNull();
      expect(getProfileRegion(profile!)).toBe('AG');
      expect(isGeneralDesc(profile!)).toBe(true);
    });
  });

  // Step 3: preferred concrete partial wins before fallback chain.
  describe('Step 3: preferred concrete partial', () => {
    it('+44 7 with preferred=GB returns GB partial (only one digit, no exact, preferred matches partial)', () => {
      const profile = resolveProfile(createResolver('44', '7'), 'GB');

      expect(profile).not.toBeNull();
      expect(getProfileRegion(profile!)).toBe('GB');
    });
  });

  // Step 4: anchored region stays alive after preferred has nothing.
  describe('Step 4: anchored partial', () => {
    it('+1 416 with off-calling-code preferred=GB returns CA via anchor', () => {
      const profile = resolveProfile(createResolver('1', '416'), 'GB');

      expect(profile).not.toBeNull();
      expect(getProfileRegion(profile!)).toBe('CA');
    });
  });

  // isAlive=false (dead state). Only terminal-prefix path is consulted.
  describe('dead-state recovery', () => {
    it('recovers a profile from terminal-prefix history once the state dies', () => {
      // 3101234 is a 310 UAN terminal; appending an invalid digit drops the DFA to a dead state.
      const resolver = createResolver('1', '3101234');
      resolver.advance(0); // pushes into dead state on most NANP roll-outs

      const profile = resolveProfileRef(resolver.snapshot, getResourceProvider().regionKeyToIndex['US']!);

      // Recovery reads the terminal-prefix history, not a live DFA state; with US preferred the NANP anchor resolves to US.
      expect(profile).not.toBeNull();
      expect(getProfileRegion(profile!)).toBe('US');
    });
  });
});

// Strict mode never leaves the preferred region.
describe('priority chain: strict', () => {
  function createStrictResolver(callingCode: string, nationalDigits: string): NumberResolver {
    const resolver = createResolver(callingCode, nationalDigits);
    resolver.setStrict(true);
    return resolver;
  }

  it('strict + preferred=US keeps US even when +1 268 is typed (AG calling-code area)', () => {
    const profile = resolveProfile(createStrictResolver('1', '2681234567'), 'US');

    expect(profile).not.toBeNull();
    expect(getProfileRegion(profile!)).toBe('US');
  });

  it('strict + preferred=-1 falls through to non-strict resolution', () => {
    const profile = resolveProfile(createStrictResolver('1', '2681234567'));

    expect(profile).not.toBeNull();
    expect(getProfileRegion(profile!)).toBe('AG');
  });
});

// Filters mutate isRegionExcluded / isNumberTypeAllowed: they must short-circuit candidates.
describe('filters', () => {
  it('regionFilter excluding CA does not return CA even when 416 normally anchors it', () => {
    const resolver = new NumberResolver();
    resolver.setRegionFilter(createRegionFilter(['US']));
    resolver.setCallingCode('1');
    for (let i = 0; i < '4165551234'.length; i++) {
      resolver.advance('4165551234'.charCodeAt(i) - 48);
    }

    const profile = resolveProfile(resolver, 'US');

    expect(profile).not.toBeNull();
    expect(getProfileRegion(profile!)).not.toBe('CA');
  });

  it('numberTypeFilter restricted to mobile excludes fixedLine resolutions', () => {
    const resolver = new NumberResolver();
    resolver.setNumberTypeFilter(createNumberTypeFilter(['MOBILE']));
    resolver.setCallingCode('1');
    for (let i = 0; i < '4165551234'.length; i++) {
      resolver.advance('4165551234'.charCodeAt(i) - 48);
    }

    const profile = resolveProfile(resolver, 'US');

    expect(profile).not.toBeNull();
    if (!isGeneralDesc(profile!)) {
      expect(getProfileType(profile!)).not.toBe('FIXED_LINE');
    }
  });

  it('numberTypeFilter still resolves region via GENERAL_DESC fallback for non-matching types', () => {
    const resolver = new NumberResolver();
    resolver.setNumberTypeFilter(createNumberTypeFilter(['MOBILE']));
    resolver.setCallingCode('1');
    for (let i = 0; i < '8005551234'.length; i++) {
      resolver.advance('8005551234'.charCodeAt(i) - 48);
    }

    const profile = resolveProfile(resolver, 'US');

    expect(profile).not.toBeNull();
    expect(getProfileRegion(profile!)).toBe('US');
  });
});
