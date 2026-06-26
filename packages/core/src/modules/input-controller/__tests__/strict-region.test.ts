import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

// Canada shares the +1 calling code with the US but has its own area codes, so a Canadian
// number is the clean case where strict must keep the input on its configured region.
const CA_NUMBER = getExampleNumber('CA', 'MOBILE');

describe('InputController strict mode: the reported region stays the preferred region', () => {
  it('national: strict keeps the configured region for a shared-calling-code number', () => {
    const controller = createNationalInputController({ defaultRegion: 'US', strict: true });
    controller.setValue(CA_NUMBER);

    expect(controller.currentState.region).toBe('US');
  });

  it('national: without strict, it resolves the number to its actual region', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue(CA_NUMBER);

    expect(controller.currentState.region).toBe('CA');
  });

  it('international: strict keeps the default region for a shared-calling-code number', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      strict: true,
      display: { callingCodeInInput: true, plusPrefix: true },
    });
    controller.setValue('+1' + CA_NUMBER);

    expect(controller.currentState.region).toBe('US');
  });
});

describe('InputController strict mode: validity is region-specific (isValidNumberForRegion)', () => {
  it('national: strict rejects a number valid only for another region in the calling code', () => {
    const controller = createNationalInputController({ defaultRegion: 'US', strict: true });
    controller.setValue(CA_NUMBER);

    const phoneNumber = controller.getPhoneNumber();
    expect(phoneNumber.isValid()).toBe(false);
    expect(phoneNumber.getValidationError()?.kind).toBe('PATTERN_MISMATCH');
  });

  it('national: without strict, the same number is valid for its actual region', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue(CA_NUMBER);

    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });
});
