import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

// Canada shares the +1 calling code with the US but has its own area codes, so a Canadian
// number is the clean case where strict must keep the input on its configured country.
const CA_NUMBER = getExampleNumber('CA', 'MOBILE');

describe('InputController strict mode: the reported country stays the preferred country', () => {
  it('national: strict keeps the configured country for a shared-calling-code number', () => {
    const controller = createNationalInputController({ country: 'US', strict: true });
    controller.setValue(CA_NUMBER);

    expect(controller.currentState.country).toBe('US');
  });

  it('national: without strict, it resolves the number to its actual region', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue(CA_NUMBER);

    expect(controller.currentState.country).toBe('CA');
  });

  it('international: strict keeps the default country for a shared-calling-code number', () => {
    const controller = createInternationalInputController({
      defaultCountry: 'US',
      strict: true,
      display: { callingCodeInInput: true, plusPrefix: true },
    });
    controller.setValue('+1' + CA_NUMBER);

    expect(controller.currentState.country).toBe('US');
  });
});

describe('InputController strict mode: validity is country-specific (isValidNumberForRegion)', () => {
  it('national: strict rejects a number valid only for another country in the calling code', () => {
    const controller = createNationalInputController({ country: 'US', strict: true });
    controller.setValue(CA_NUMBER);

    const phoneNumber = controller.getPhoneNumber();
    expect(phoneNumber.isValid()).toBe(false);
    expect(phoneNumber.getValidationError()?.kind).toBe('PATTERN_MISMATCH');
  });

  it('national: without strict, the same number is valid for its actual country', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue(CA_NUMBER);

    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });
});
