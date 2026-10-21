import { RegionCode } from '@telixon/core/engine';
import { describe, expect, it } from 'vitest';
import { createNationalInputController } from '..';
import { InputController } from '../../models';

function typeNational(region: RegionCode, digits: string): { controller: InputController; value: string } {
  const controller = createNationalInputController({ defaultRegion: region });
  let state = controller.currentState;
  for (const character of digits) {
    state = controller.insert(state.value, character, state.selectionStart, state.selectionEnd);
  }
  return { controller, value: state.value };
}

// A territory whose national prefix rule adds digits at parse time, such as the area code 340 before a seven-digit
// Virgin Islands number, keeps the typed digits a number of their own on screen. Each local number is Google's example
// number without the added digits, and each value is what Google's AsYouTypeFormatter shows for it.
describe('national controller: a number completed by a digit-adding transform groups by its typed length', () => {
  it.each([
    { region: 'AG', local: '4601234', value: '460-1234', e164: '+12684601234' },
    { region: 'AI', local: '4612345', value: '461-2345', e164: '+12644612345' },
    { region: 'AS', local: '6221234', value: '622-1234', e164: '+16846221234' },
    { region: 'BB', local: '4123456', value: '412-3456', e164: '+12464123456' },
    { region: 'BM', local: '4123456', value: '412-3456', e164: '+14414123456' },
    { region: 'BS', local: '3456789', value: '345-6789', e164: '+12423456789' },
    { region: 'DM', local: '4201234', value: '420-1234', e164: '+17674201234' },
    { region: 'GD', local: '2691234', value: '269-1234', e164: '+14732691234' },
    { region: 'GU', local: '3001234', value: '300-1234', e164: '+16713001234' },
    { region: 'KN', local: '2361234', value: '236-1234', e164: '+18692361234' },
    { region: 'KY', local: '2221234', value: '222-1234', e164: '+13452221234' },
    { region: 'LC', local: '4305678', value: '430-5678', e164: '+17584305678' },
    { region: 'MP', local: '2345678', value: '234-5678', e164: '+16702345678' },
    { region: 'MS', local: '4912345', value: '491-2345', e164: '+16644912345' },
    { region: 'SX', local: '5425678', value: '542-5678', e164: '+17215425678' },
    { region: 'TC', local: '7121234', value: '712-1234', e164: '+16497121234' },
    { region: 'TT', local: '2211234', value: '221-1234', e164: '+18682211234' },
    { region: 'VC', local: '2661234', value: '266-1234', e164: '+17842661234' },
    { region: 'VG', local: '2291234', value: '229-1234', e164: '+12842291234' },
    { region: 'VI', local: '6421234', value: '642-1234', e164: '+13406421234' },
    { region: 'CC', local: '91621234', value: '91621234', e164: '+61891621234' },
    { region: 'CX', local: '91641234', value: '91641234', e164: '+61891641234' },
    { region: 'GG', local: '256789', value: '256789', e164: '+441481256789' },
    { region: 'IM', local: '756789', value: '756789', e164: '+441624756789' },
    { region: 'JE', local: '456789', value: '456789', e164: '+441534456789' },
    { region: 'SM', local: '886377', value: '886377', e164: '+3780549886377' },
  ] as const)('$region $local shows $value and resolves to $e164', ({ region, local, value, e164 }) => {
    const typed = typeNational(region, local);

    expect(typed.value).toBe(value);
    expect(typed.controller.getPhoneNumber().isValid()).toBe(true);
    expect(typed.controller.getPhoneNumber().formatE164()).toBe(e164);
  });

  // The transform applies to exactly seven digits, whatever they are. A full number passes through the same
  // grouping at the seventh digit and regroups on the eighth, as in Google's formatter.
  it.each([
    { digits: '6421234', value: '642-1234' },
    { digits: '3406421', value: '340-6421' },
    { digits: '64212345', value: '(642) 123-45' },
    { digits: '3406421234', value: '(340) 642-1234' },
  ])('VI $digits shows $value', ({ digits, value }) => {
    expect(typeNational('VI', digits).value).toBe(value);
  });
});
