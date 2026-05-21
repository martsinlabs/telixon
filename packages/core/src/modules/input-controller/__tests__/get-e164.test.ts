import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

describe('PhoneNumber.getE164 — national', () => {
  it('returns null while the number is incomplete', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('21255');

    expect(controller.getPhoneNumber().getE164()).toBeNull();
  });

  it('returns the canonical E.164 for a valid number', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('2125551234');

    expect(controller.getPhoneNumber().getE164()).toBe('+12125551234');
  });

  it('drops the national prefix before assembling E.164', () => {
    const controller = createNationalInputController({ country: 'GB' });
    controller.setValue('07911123456');

    expect(controller.getPhoneNumber().getE164()).toBe('+447911123456');
  });
});

describe('PhoneNumber.getE164 — international', () => {
  it('returns null for calling-code only', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1');

    expect(controller.getPhoneNumber().getE164()).toBeNull();
  });

  it('returns the canonical E.164 for a full number', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1 (212) 555-1234');

    expect(controller.getPhoneNumber().getE164()).toBe('+12125551234');
  });
});
