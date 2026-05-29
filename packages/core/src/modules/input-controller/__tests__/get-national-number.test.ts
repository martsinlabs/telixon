import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

describe('PhoneNumber.getNationalNumber: national', () => {
  it('returns empty string for empty input', () => {
    const controller = createNationalInputController({ country: 'US' });

    expect(controller.getPhoneNumber().getNationalNumber()).toBe('');
  });

  it('returns the digits typed so far for partial input', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('21255');

    expect(controller.getPhoneNumber().getNationalNumber()).toBe('21255');
  });

  it('returns digits only, stripping formatting characters', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('(212) 555-1234');

    expect(controller.getPhoneNumber().getNationalNumber()).toBe('2125551234');
  });

  it('strips the national prefix (AR 0 prefix)', () => {
    const controller = createNationalInputController({ country: 'AR' });
    controller.setValue('01112345678');

    expect(controller.getPhoneNumber().getNationalNumber()).toBe('1112345678');
  });

  it('applies the AR mobile transform (drops the 0 prefix and 15, prepends 9)', () => {
    const controller = createNationalInputController({ country: 'AR' });
    controller.setValue('0111523456789');

    expect(controller.getPhoneNumber().getNationalNumber()).toBe('91123456789');
  });
});

describe('PhoneNumber.getNationalNumber: international', () => {
  it('returns the national part without the calling code', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    controller.setValue('12125551234');

    expect(controller.getPhoneNumber().getNationalNumber()).toBe('2125551234');
  });
});
