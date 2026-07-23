import { RegionCode } from '@telixon/core/engine';
import { describe, expect, it } from 'vitest';
import { createNationalInputController } from '..';
import { InputState } from '../../models';

function typeNational(region: RegionCode, digits: string): InputState {
  const controller = createNationalInputController({ defaultRegion: region });
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
      region: 'CA',
      digits: '3101434444',
      value: '(310) 143-4444',
      expectedRegion: 'US',
    },
    {
      name: 'CA mode, Bahamas area code',
      region: 'CA',
      digits: '2425554444',
      value: '(242) 555-4444',
      expectedRegion: 'BS',
    },
    {
      name: 'US mode, Anguilla area code',
      region: 'US',
      digits: '2644612345',
      value: '(264) 461-2345',
      expectedRegion: 'AI',
    },
    {
      name: 'US mode, Antigua invalid exchange',
      region: 'US',
      digits: '2681434444',
      value: '(268) 143-4444',
      expectedRegion: 'AG',
    },
  ] as const)('$name: $digits -> $value (region $expectedRegion)', ({ region, digits, value, expectedRegion }) => {
    const state = typeNational(region, digits);
    expect(state.value).toBe(value);
    expect(state.region).toBe(expectedRegion);
  });

  it.each([
    { name: 'CA valid', region: 'CA', digits: '4165550123', value: '(416) 555-0123', expectedRegion: 'CA' },
    { name: 'US valid', region: 'US', digits: '3105550123', value: '(310) 555-0123', expectedRegion: 'US' },
  ] as const)(
    'valid control $name: $digits -> $value (region $expectedRegion)',
    ({ region, digits, value, expectedRegion }) => {
      const state = typeNational(region, digits);
      expect(state.value).toBe(value);
      expect(state.region).toBe(expectedRegion);
    },
  );
});

// A number-type filter that admits the number's own type must not turn it impossible or report the
// calling code invalid. The possibility reason may sharpen from local-only to fully possible.
describe('national controller: a number-type filter admitting the reported type stays consistent', () => {
  it('keeps a resolved number possible and formattable under its own type', () => {
    const controller = createNationalInputController({ defaultRegion: 'CA' });
    controller.setValue('3101234');

    const before = controller.getPhoneNumber();
    expect(before.getNumberType()).toBe('UAN');
    expect(before.isValid()).toBe(true);

    controller.setNumberTypeFilter(['UAN']);
    const after = controller.getPhoneNumber();

    expect(after.isValid()).toBe(true);
    expect(after.isPossible()).toBe(true);
    expect(after.isPossibleWithReason()).not.toBe('INVALID_CALLING_CODE');
    expect(after.formatE164()).toBe(before.formatE164());
  });
});
