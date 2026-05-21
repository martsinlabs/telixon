import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

describe('PhoneNumber.getCallingCode — national', () => {
  it("returns the bound country's calling code, even when empty", () => {
    const controller = createNationalInputController({ country: 'US' });

    expect(controller.getPhoneNumber().getCallingCode()).toBe('1');
  });

  it('returns the multi-digit calling code for the bound country', () => {
    const controller = createNationalInputController({ country: 'GB' });

    expect(controller.getPhoneNumber().getCallingCode()).toBe('44');
  });
});

describe('PhoneNumber.getCallingCode — international', () => {
  it('returns null before a calling code resolves', () => {
    const controller = createInternationalInputController({});

    expect(controller.getPhoneNumber().getCallingCode()).toBeNull();
  });

  it('resolves the calling code from the typed digits', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+442012345678');

    expect(controller.getPhoneNumber().getCallingCode()).toBe('44');
  });

  it('resolves the calling code before the national number is complete', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1');

    expect(controller.getPhoneNumber().getCallingCode()).toBe('1');
  });
});
