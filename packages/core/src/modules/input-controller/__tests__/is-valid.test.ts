import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

describe('InputController.isValid — national', () => {
  it('returns false for empty input', () => {
    const controller = createNationalInputController({ country: 'US' });

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('returns false for too-short input', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('212555');

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('returns true at a valid US 10-digit number', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('2125551234');

    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });

  it('returns false when digits overshoot the valid length', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('21255512345');

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('returns false when length matches but the pattern is broken (bogus area code)', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('0001234567');

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('counts normalized national digits, not raw — national prefix is stripped before length check', () => {
    const controller = createNationalInputController({ country: 'AR' });
    controller.setValue('01112345678');

    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });

  it('handles AR mobile with national prefix + 15 mobile indicator — normalization transforms 0AAA15NNNN to 9AAANNNN', () => {
    const controller = createNationalInputController({ country: 'AR' });
    controller.setValue('0111523456789');

    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });

  it('reflects undo state', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('2125551234');
    expect(controller.getPhoneNumber().isValid()).toBe(true);

    controller.undo();
    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('returns false when only GENERAL_DESC matches — number-type filter excludes the concrete type', () => {
    const controller = createNationalInputController({ country: 'DE' });
    controller.setNumberTypeFilter(['MOBILE']);
    controller.setValue('03012345678');

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });
});

describe('InputController.isValid — international', () => {
  it('returns false for empty input', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('returns false for calling-code only', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    controller.setValue('1');

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('returns true for a full international number', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    controller.setValue('12125551234');

    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });

  it('returns false for an overshot length', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    controller.setValue('121255512349999');

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });
});
