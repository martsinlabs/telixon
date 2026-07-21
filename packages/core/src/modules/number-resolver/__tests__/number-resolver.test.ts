import { ENGINE_DEAD, hasExactMatch } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { describe, expect, it } from 'vitest';
import { NumberResolver } from '../number-resolver';
import { createNumberTypeFilter, createRegionFilter } from '../utils/filter-factory';

function digitsOf(digits: string): number[] {
  return Array.from(digits, (d) => d.charCodeAt(0) - 48);
}

function advanceAll(resolver: NumberResolver, digits: string): void {
  for (const digit of digitsOf(digits)) resolver.advance(digit);
}

describe('NumberResolver: initial state', () => {
  it('starts at state 0 with empty digits and no terminal', () => {
    const resolver = new NumberResolver();

    expect(resolver.state).toBe(0);
    expect(hasExactMatch(getResourceProvider().engine, resolver.endState)).toBe(false);
    expect(resolver.getCallingCode()).toBe('');
    expect(resolver.getNationalNumber()).toBe('');
    expect(resolver.callingCodeCompleted).toBe(false);
    expect(resolver.callingCodeState).toBe(-1);
    expect(resolver.nationalNumberLength).toBe(0);
  });

  it('snapshot reflects initial state', () => {
    const resolver = new NumberResolver();
    const snap = resolver.snapshot;

    expect(snap.endState).toBe(0);
    expect(snap.callingCodeDigits).toBe('');
    expect(snap.nationalDigits).toBe('');
    expect(snap.callingCodeCompleted).toBe(false);
    expect(snap.callingCodeState).toBe(-1);
    expect(snap.regionFilter).toBeNull();
    expect(snap.numberTypeFilter).toBeNull();
    expect(snap.strict).toBe(false);
  });
});

describe('NumberResolver: advance', () => {
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
    // 26 digits, well past any real national length, must hit the dead state.
    advanceAll(resolver, '99999999999999999999999999');

    expect(resolver.state).toBe(ENGINE_DEAD);
    expect(resolver.getNationalNumber().length).toBe(26);
  });

  it('deadState is sticky, subsequent digits do not revive it', () => {
    const resolver = new NumberResolver();
    resolver.setCallingCode('1');
    advanceAll(resolver, '99999999999999999999999999');
    const stateAfterFirst = resolver.state;
    expect(stateAfterFirst).toBe(ENGINE_DEAD);

    resolver.advance(0);
    expect(resolver.state).toBe(ENGINE_DEAD);
  });

  it('reaches a state carrying exact acceptance as the walk crosses terminals', () => {
    const resolver = new NumberResolver();
    resolver.setCallingCode('1');
    expect(hasExactMatch(getResourceProvider().engine, resolver.endState)).toBe(false);

    advanceAll(resolver, '4165551234');
    expect(hasExactMatch(getResourceProvider().engine, resolver.endState)).toBe(true);
  });
});

describe('NumberResolver: setCallingCode / reset', () => {
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
    expect(hasExactMatch(getResourceProvider().engine, resolver.endState)).toBe(false);
    expect(resolver.getCallingCode()).toBe('');
    expect(resolver.getNationalNumber()).toBe('');
    expect(resolver.callingCodeCompleted).toBe(false);
    expect(resolver.callingCodeState).toBe(-1);
  });
});

describe('NumberResolver: filters', () => {
  it('preserves filters across reset (filters are configuration, not state)', () => {
    const resolver = new NumberResolver();
    const regionFilter = createRegionFilter(['US']);
    const numberTypeFilter = createNumberTypeFilter(['MOBILE']);

    resolver.setRegionFilter(regionFilter);
    resolver.setNumberTypeFilter(numberTypeFilter);
    resolver.reset();

    expect(resolver.snapshot.regionFilter).toBe(regionFilter);
    expect(resolver.snapshot.numberTypeFilter).toBe(numberTypeFilter);
  });

  it('null filters disable both region and number-type filtering', () => {
    const resolver = new NumberResolver();
    resolver.setRegionFilter(createRegionFilter(['US']));
    resolver.setRegionFilter(null);
    resolver.setNumberTypeFilter(null);

    expect(resolver.snapshot.regionFilter).toBeNull();
    expect(resolver.snapshot.numberTypeFilter).toBeNull();
  });

  it('walks a seeded calling code past an excluding region filter', () => {
    const resolver = new NumberResolver();
    resolver.setRegionFilter(createRegionFilter(['US']));

    resolver.setCallingCode('44');
    advanceAll(resolver, '7400123456');

    expect(resolver.getCallingCode()).toBe('44');
    expect(resolver.callingCodeCompleted).toBe(true);
    expect(resolver.getNationalNumber()).toBe('7400123456');
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
