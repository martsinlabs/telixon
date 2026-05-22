import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

describe('PhoneNumber.getURI — national', () => {
  it('returns null while the number is incomplete', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('21255');

    expect(controller.getPhoneNumber().getURI()).toBeNull();
  });

  it('returns the RFC3966 tel: URI for a valid number', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('2125551234');

    expect(controller.getPhoneNumber().getURI()).toBe('tel:+1-212-555-1234');
  });

  it('drops the national prefix before assembling the URI', () => {
    const controller = createNationalInputController({ country: 'GB' });
    controller.setValue('07911123456');

    expect(controller.getPhoneNumber().getURI()).toBe('tel:+44-7911-123456');
  });
});

describe('PhoneNumber.getURI — international', () => {
  it('returns null for calling-code only', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1');

    expect(controller.getPhoneNumber().getURI()).toBeNull();
  });

  it('returns the RFC3966 tel: URI for a full number', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1 (212) 555-1234');

    expect(controller.getPhoneNumber().getURI()).toBe('tel:+1-212-555-1234');
  });
});
