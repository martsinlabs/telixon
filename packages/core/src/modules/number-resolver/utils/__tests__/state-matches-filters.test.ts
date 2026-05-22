import { isCallingCodeState } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { describe, expect, it } from 'vitest';
import { NumberResolver } from '../../number-resolver';
import { stateMatchesFilters } from '../state-matches-filters';
import { terminalStateMatchesFilters } from '../terminal-state-matches-filters';

function walkTo(digits: string): NumberResolver {
  const resolver = new NumberResolver();
  for (const digit of digits) resolver.advance(digit.charCodeAt(0) - 48);
  return resolver;
}

function matchAllCountries(): Uint8Array {
  return new Uint8Array(getResourceProvider().refMapping.regions.indexToKey.length).fill(1);
}

function matchNoCountries(): Uint8Array {
  return new Uint8Array(getResourceProvider().refMapping.regions.indexToKey.length);
}

function matchAllNumberTypes(): Uint8Array {
  return new Uint8Array(getResourceProvider().refMapping.numberTypes.length).fill(1);
}

function matchNoNumberTypes(): Uint8Array {
  return new Uint8Array(getResourceProvider().refMapping.numberTypes.length);
}

describe('stateMatchesFilters', () => {
  it('short-circuits to true when both filters are null', () => {
    expect(stateMatchesFilters(0, null, null)).toBe(true);
    expect(stateMatchesFilters(42, null, null)).toBe(true);
  });

  describe('calling-code state', () => {
    it('returns true with a match-all country filter', () => {
      const state = walkTo('1').callingCodeState;

      expect(isCallingCodeState(getResourceProvider().callingCodeLayer, state)).toBe(true);
      expect(stateMatchesFilters(state, matchAllCountries(), null)).toBe(true);
    });

    it('returns false with a match-none country filter', () => {
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

    it('returns false when the country filter allows no country', () => {
      const resolver = walkTo('1416');

      expect(stateMatchesFilters(resolver.state, matchNoCountries(), null)).toBe(false);
    });

    it('returns false when the number-type filter allows no type', () => {
      const resolver = walkTo('1416');

      expect(stateMatchesFilters(resolver.state, null, matchNoNumberTypes())).toBe(false);
    });
  });
});

describe('terminalStateMatchesFilters', () => {
  it('short-circuits to true when both filters are null', () => {
    expect(terminalStateMatchesFilters(0, null, null)).toBe(true);
    expect(terminalStateMatchesFilters(99, null, null)).toBe(true);
  });

  it('returns true at a terminal state with match-all filters', () => {
    const resolver = walkTo('14165551234');
    const terminal = resolver.terminalStates[0];

    expect(terminal).toBeDefined();
    expect(terminalStateMatchesFilters(terminal!, matchAllCountries(), matchAllNumberTypes())).toBe(true);
  });

  it('returns false at a terminal state with a match-none country filter', () => {
    const resolver = walkTo('14165551234');
    const terminal = resolver.terminalStates[0];

    expect(terminalStateMatchesFilters(terminal!, matchNoCountries(), null)).toBe(false);
  });

  it('returns false when the number-type filter allows no terminal type', () => {
    const resolver = walkTo('14165551234');
    const terminal = resolver.terminalStates[0];

    expect(terminalStateMatchesFilters(terminal!, null, matchNoNumberTypes())).toBe(false);
  });
});
