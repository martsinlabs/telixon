import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { parsePhoneNumber } from '..';

const GB_FIXED = getExampleNumber('GB', 'FIXED_LINE');

describe('parsePhoneNumber: IDD prefix stripping (libphonenumber FROM_NUMBER_WITH_IDD)', () => {
  it('strips the region IDD prefix and parses the remainder as international', () => {
    // Dialled from Germany (IDD "00") to a UK number: "00" + "44" + national.
    const number = parsePhoneNumber('0044' + GB_FIXED, { defaultRegion: 'DE' });

    expect(number.getCallingCode()).toBe('44');
    expect(number.getRegion()).toBe('GB');
    expect(number.getNationalNumber()).toBe(GB_FIXED);
  });

  it('does not strip when the digit after the IDD prefix is a national trunk 0', () => {
    // "000..." is not an IDD: the 0 after "00" is a national digit, so it stays national.
    const number = parsePhoneNumber('0001234', { defaultRegion: 'DE' });

    expect(number.getCallingCode()).toBe('49');
  });
});
