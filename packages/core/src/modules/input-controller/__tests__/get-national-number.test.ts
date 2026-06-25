import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_MOBILE_INTL = '1' + US_MOBILE;
const US_MOBILE_NATIONAL = '(201) 555-0123';

describe('PhoneNumber.getNationalNumber: national', () => {
  it('returns empty string for empty input', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });

    expect(controller.getPhoneNumber().getNationalNumber()).toBe('');
  });

  it('returns the digits typed so far for partial input', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue('21255');

    expect(controller.getPhoneNumber().getNationalNumber()).toBe('21255');
  });

  it('returns digits only, stripping formatting characters', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue(US_MOBILE_NATIONAL);

    expect(controller.getPhoneNumber().getNationalNumber()).toBe(US_MOBILE);
  });

  it('strips the national prefix (AR 0 prefix)', () => {
    const controller = createNationalInputController({ defaultRegion: 'AR' });
    controller.setValue('01112345678');

    expect(controller.getPhoneNumber().getNationalNumber()).toBe('1112345678');
  });

  it('applies the AR mobile transform (drops the 0 prefix and 15, prepends 9)', () => {
    const controller = createNationalInputController({ defaultRegion: 'AR' });
    controller.setValue('0111523456789');

    expect(controller.getPhoneNumber().getNationalNumber()).toBe('91123456789');
  });
});

describe('PhoneNumber.getNationalNumber: international', () => {
  it('returns the national part without the calling code', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue(US_MOBILE_INTL);

    expect(controller.getPhoneNumber().getNationalNumber()).toBe(US_MOBILE);
  });
});
