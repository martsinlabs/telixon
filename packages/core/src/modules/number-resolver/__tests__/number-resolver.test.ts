import { getResourceProvider } from '@telixon/core/resource-provider';
import { describe, expect, it } from 'vitest';
import { NumberResolver } from '../number-resolver';
import { createCountryFilter, createNumberTypeFilter } from '../utils/filter-factory';

function digitsOf(digits: string): number[] {
  return Array.from(digits, (d) => d.charCodeAt(0) - 48);
}

function advanceAll(resolver: NumberResolver, digits: string): void {
  for (const digit of digitsOf(digits)) resolver.advance(digit);
}

describe('NumberResolver — initial state', () => {
  it('starts at state 0 with empty digits and no terminal', () => {
    const resolver = new NumberResolver();

    expect(resolver.state).toBe(0);
    expect(resolver.terminalStates).toHaveLength(0);
    expect(resolver.getCallingCode()).toBe('');
    expect(resolver.getNationalNumber()).toBe('');
    expect(resolver.callingCodeCompleted).toBe(false);
    expect(resolver.callingCodeState).toBe(-1);
    expect(resolver.nationalNumberLength).toBe(0);
  });

  it('snapshot reflects initial state', () => {
    const resolver = new NumberResolver();
    const snap = resolver.snapshot;

    expect(snap.state).toBe(0);
    expect(snap.terminalStates).toHaveLength(0);
    expect(snap.callingCodeDigits).toBe('');
    expect(snap.nationalDigits).toBe('');
    expect(snap.callingCodeCompleted).toBe(false);
    expect(snap.callingCodeState).toBe(-1);
    expect(snap.countryFilter).toBeNull();
    expect(snap.numberTypeFilter).toBeNull();
    expect(snap.strict).toBe(false);
  });
});

describe('NumberResolver — advance', () => {
  it('accumulates calling-code digits during prefix walk', () => {
    const resolver = new NumberResolver();
    resolver.advance(1);

    expect(resolver.getCallingCode()).toBe('1');
    expect(resolver.callingCodeCompleted).toBe(true);
  });

  it('accumulates national digits after the calling code is completed', () => {
    const resolver = new NumberResolver();
    resolver.setCallingCode('1');
    advanceAll(resolver, '4165551234');

    expect(resolver.getCallingCode()).toBe('1');
    expect(resolver.getNationalNumber()).toBe('4165551234');
    expect(resolver.nationalNumberLength).toBe(10);
  });

  it('absorbs further digits into nationalDigits once stuck in deadState', () => {
    const resolver = new NumberResolver();
    resolver.setCallingCode('1');
    const deadStateId = getResourceProvider().graphLayer.deadStateId;

    // 26 digits — well past any real national length, must hit deadState.
    advanceAll(resolver, '99999999999999999999999999');

    expect(resolver.state).toBe(deadStateId);
    expect(resolver.getNationalNumber().length).toBe(26);
  });

  it('deadState is sticky — subsequent digits do not revive it', () => {
    const resolver = new NumberResolver();
    resolver.setCallingCode('1');
    const deadStateId = getResourceProvider().graphLayer.deadStateId;

    advanceAll(resolver, '99999999999999999999999999');
    const stateAfterFirst = resolver.state;
    expect(stateAfterFirst).toBe(deadStateId);

    resolver.advance(0);
    expect(resolver.state).toBe(deadStateId);
  });

  it('accumulates terminalStates as the walk crosses terminal-prefix states', () => {
    const resolver = new NumberResolver();
    resolver.setCallingCode('1');
    expect(resolver.terminalStates).toHaveLength(0);

    advanceAll(resolver, '4165551234');
    expect(resolver.terminalStates.length).toBeGreaterThan(0);
  });
});

describe('NumberResolver — setCallingCode / reset', () => {
  it('setCallingCode resets prior state and replays the new code', () => {
    const resolver = new NumberResolver();
    resolver.setCallingCode('1');
    advanceAll(resolver, '4165551234');

    resolver.setCallingCode('44');

    expect(resolver.getCallingCode()).toBe('44');
    expect(resolver.getNationalNumber()).toBe('');
    expect(resolver.nationalNumberLength).toBe(0);
  });

  it('reset clears every field exposed via the snapshot', () => {
    const resolver = new NumberResolver();
    resolver.setCallingCode('1');
    advanceAll(resolver, '4165551234');

    resolver.reset();

    expect(resolver.state).toBe(0);
    expect(resolver.terminalStates).toHaveLength(0);
    expect(resolver.getCallingCode()).toBe('');
    expect(resolver.getNationalNumber()).toBe('');
    expect(resolver.callingCodeCompleted).toBe(false);
    expect(resolver.callingCodeState).toBe(-1);
  });
});

describe('NumberResolver — filters', () => {
  it('preserves filters across reset (filters are configuration, not state)', () => {
    const resolver = new NumberResolver();
    const countryFilter = createCountryFilter(['US']);
    const numberTypeFilter = createNumberTypeFilter(['MOBILE']);

    resolver.setCountryFilter(countryFilter);
    resolver.setNumberTypeFilter(numberTypeFilter);
    resolver.reset();

    expect(resolver.snapshot.countryFilter).toBe(countryFilter);
    expect(resolver.snapshot.numberTypeFilter).toBe(numberTypeFilter);
  });

  it('null filters disable both country and number-type filtering', () => {
    const resolver = new NumberResolver();
    resolver.setCountryFilter(createCountryFilter(['US']));
    resolver.setCountryFilter(null);
    resolver.setNumberTypeFilter(null);

    expect(resolver.snapshot.countryFilter).toBeNull();
    expect(resolver.snapshot.numberTypeFilter).toBeNull();
  });

  it('setStrict toggles the strict flag in the snapshot', () => {
    const resolver = new NumberResolver();

    expect(resolver.snapshot.strict).toBe(false);
    resolver.setStrict(true);
    expect(resolver.snapshot.strict).toBe(true);
    resolver.setStrict(false);
    expect(resolver.snapshot.strict).toBe(false);
  });
});
