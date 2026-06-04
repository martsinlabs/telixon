import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_MOBILE_URI = 'tel:+1-201-555-0123';
const GB_MOBILE_WITH_PREFIX = '0' + getExampleNumber('GB', 'MOBILE');
const GB_MOBILE_URI = 'tel:+44-7400-123456';
const US_MOBILE_NATIONAL = '(201) 555-0123';

describe('PhoneNumber.getURI: national', () => {
  it('returns null while the number is incomplete', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('21255');

    expect(controller.getPhoneNumber().getURI()).toBeNull();
  });

  it('returns the RFC3966 tel: URI for a valid number', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue(US_MOBILE);

    expect(controller.getPhoneNumber().getURI()).toBe(US_MOBILE_URI);
  });

  it('drops the national prefix before assembling the URI', () => {
    const controller = createNationalInputController({ country: 'GB' });
    controller.setValue(GB_MOBILE_WITH_PREFIX);

    expect(controller.getPhoneNumber().getURI()).toBe(GB_MOBILE_URI);
  });
});

describe('PhoneNumber.getURI: international', () => {
  it('returns null for calling-code only', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1');

    expect(controller.getPhoneNumber().getURI()).toBeNull();
  });

  it('returns the RFC3966 tel: URI for a full number', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1 ' + US_MOBILE_NATIONAL);

    expect(controller.getPhoneNumber().getURI()).toBe(US_MOBILE_URI);
  });
});
