import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

describe('PhoneNumber.formatNational: national', () => {
  it('returns null while the number is not yet possible', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('21255');

    expect(controller.getPhoneNumber().formatNational()).toBeNull();
  });

  it('groups a valid US number without adding a prefix', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('2125551234');

    expect(controller.getPhoneNumber().formatNational()).toBe('(212) 555-1234');
  });

  it('reconstructs the national prefix from the format rule', () => {
    const controller = createNationalInputController({ country: 'GB' });
    controller.setValue('07911123456');

    expect(controller.getPhoneNumber().formatNational()).toBe('07911 123456');
  });

  it('formats a possible-but-invalid number', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('3101234434');

    expect(controller.getPhoneNumber().formatNational()).toBe('(310) 123-4434');
  });
});

describe('PhoneNumber.formatNational: international', () => {
  it('returns null for calling-code only', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1');

    expect(controller.getPhoneNumber().formatNational()).toBeNull();
  });

  it('groups a full number in national form', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1 (212) 555-1234');

    expect(controller.getPhoneNumber().formatNational()).toBe('(212) 555-1234');
  });
});
