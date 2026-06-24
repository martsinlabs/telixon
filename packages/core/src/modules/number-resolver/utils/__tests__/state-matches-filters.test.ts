import { isInCallingCode } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { describe, expect, it } from 'vitest';
import { NumberResolver } from '../../number-resolver';
import { stateMatchesFilters } from '../state-matches-filters';

function walkTo(digits: string): NumberResolver {
  const resolver = new NumberResolver();
  for (const digit of digits) resolver.advance(digit.charCodeAt(0) - 48);
  return resolver;
}

function matchAllCountries(): Uint8Array {
  return new Uint8Array(getResourceProvider().regionIds.length).fill(1);
}

function matchNoCountries(): Uint8Array {
  return new Uint8Array(getResourceProvider().regionIds.length);
}

function matchAllNumberTypes(): Uint8Array {
  return new Uint8Array(getResourceProvider().numberTypeNames.length).fill(1);
}

function matchNoNumberTypes(): Uint8Array {
  return new Uint8Array(getResourceProvider().numberTypeNames.length);
}

describe('stateMatchesFilters', () => {
  it('short-circuits to true when both filters are null', () => {
    expect(stateMatchesFilters(0, null, null)).toBe(true);
    expect(stateMatchesFilters(42, null, null)).toBe(true);
  });

  describe('calling-code state', () => {
    it('returns true with a match-all region filter', () => {
      const state = walkTo('1').callingCodeState;

      expect(isInCallingCode(getResourceProvider().engine, state)).toBe(true);
      expect(stateMatchesFilters(state, matchAllCountries(), null)).toBe(true);
    });

    it('returns false with a match-none region filter', () => {
      const state = walkTo('1').callingCodeState;

      expect(stateMatchesFilters(state, matchNoCountries(), null)).toBe(false);
    });

    it('ignores the number-type filter at a calling-code state', () => {
      const state = walkTo('1').callingCodeState;

      expect(stateMatchesFilters(state, null, matchNoNumberTypes())).toBe(true);
    });
  });

  describe('regular state', () => {
    it('returns true with match-all filters at a mid-walk state', () => {
      const resolver = walkTo('1416');

      expect(stateMatchesFilters(resolver.state, matchAllCountries(), matchAllNumberTypes())).toBe(true);
    });

    it('returns false when the region filter allows no region', () => {
      const resolver = walkTo('1416');

      expect(stateMatchesFilters(resolver.state, matchNoCountries(), null)).toBe(false);
    });

    it('returns false when the number-type filter allows no type', () => {
      const resolver = walkTo('1416');

      expect(stateMatchesFilters(resolver.state, null, matchNoNumberTypes())).toBe(false);
    });
  });
});
