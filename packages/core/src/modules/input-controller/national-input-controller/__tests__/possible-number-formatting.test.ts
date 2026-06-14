import { RegionId } from '@telixon/core/engine';
import { describe, expect, it } from 'vitest';
import { createNationalInputController } from '..';
import { InputState } from '../../models';

function typeNational(country: RegionId, digits: string): InputState {
  const controller = createNationalInputController({ country });
  let state: InputState = controller.currentState;
  for (const character of digits) {
    state = controller.insert(state.value, character, state.selectionStart, state.selectionEnd);
  }
  return state;
}

// Possible-but-not-valid numbers group like Google's AsYouTypeFormatter; values are its final snapshot.
describe('national controller: possible-but-not-valid numbers still group', () => {
  // Region tracks libphonenumber: a territory's leading digits win (242 -> BS), else the primary region (US).
  it.each([
    {
      name: 'CA mode, invalid US exchange',
      country: 'CA',
      digits: '3101434444',
      value: '(310) 143-4444',
      region: 'US',
    },
    { name: 'CA mode, Bahamas area code', country: 'CA', digits: '2425554444', value: '(242) 555-4444', region: 'BS' },
    { name: 'US mode, Anguilla area code', country: 'US', digits: '2644612345', value: '(264) 461-2345', region: 'AI' },
    {
      name: 'US mode, Antigua invalid exchange',
      country: 'US',
      digits: '2681434444',
      value: '(268) 143-4444',
      region: 'AG',
    },
  ] as const)('$name: $digits -> $value (region $region)', ({ country, digits, value, region }) => {
    const state = typeNational(country, digits);
    expect(state.value).toBe(value);
    expect(state.country).toBe(region);
  });

  it.each([
    { name: 'CA valid', country: 'CA', digits: '4165550123', value: '(416) 555-0123', region: 'CA' },
    { name: 'US valid', country: 'US', digits: '3105550123', value: '(310) 555-0123', region: 'US' },
  ] as const)('valid control $name: $digits -> $value (region $region)', ({ country, digits, value, region }) => {
    const state = typeNational(country, digits);
    expect(state.value).toBe(value);
    expect(state.country).toBe(region);
  });
});
