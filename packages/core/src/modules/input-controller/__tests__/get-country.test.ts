import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

describe('PhoneNumber.getCountry: national', () => {
  it('returns the configured country for a valid number', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('2125551234');

    expect(controller.getPhoneNumber().getCountry()).toBe('US');
  });

  it('returns the country for a geographic landline', () => {
    const controller = createNationalInputController({ country: 'GB' });
    controller.setValue('02079460000');

    expect(controller.getPhoneNumber().getCountry()).toBe('GB');
  });
});

describe('PhoneNumber.getCountry: international', () => {
  it('returns null before anything resolves', () => {
    const controller = createInternationalInputController({});

    expect(controller.getPhoneNumber().getCountry()).toBeNull();
  });

  it('resolves the region from a full international number', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+442079460000');

    expect(controller.getPhoneNumber().getCountry()).toBe('GB');
  });
});
