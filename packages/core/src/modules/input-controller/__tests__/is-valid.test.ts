import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_MOBILE_INTL = '1' + US_MOBILE;
const DE_FIXED_WITH_PREFIX = '0' + getExampleNumber('DE', 'FIXED_LINE');

describe('InputController.isValid: national', () => {
  it('returns false for empty input', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('returns false for too-short input', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue('212555');

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('returns true at a valid US 10-digit number', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue(US_MOBILE);

    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });

  it('returns false when digits overshoot the valid length', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue('21255512345');

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('returns false when length matches but the pattern is broken (bogus area code)', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue('0001234567');

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('counts normalized national digits, not raw: national prefix is stripped before length check', () => {
    const controller = createNationalInputController({ defaultRegion: 'AR' });
    controller.setValue('01112345678');

    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });

  it('handles AR mobile with national prefix + 15 mobile indicator: normalization transforms 0AAA15NNNN to 9AAANNNN', () => {
    const controller = createNationalInputController({ defaultRegion: 'AR' });
    controller.setValue('0111523456789');

    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });

  it('reflects undo state', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue(US_MOBILE);
    expect(controller.getPhoneNumber().isValid()).toBe(true);

    controller.undo();
    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('returns false when only GENERAL_DESC matches: number-type filter excludes the concrete type', () => {
    const controller = createNationalInputController({ defaultRegion: 'DE' });
    controller.setNumberTypeFilter(['MOBILE']);
    controller.setValue(DE_FIXED_WITH_PREFIX);

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });
});

describe('InputController.isValid: international', () => {
  it('returns false for empty input', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('returns false for calling-code only', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue('1');

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('returns true for a full international number', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue(US_MOBILE_INTL);

    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });

  it('returns false for an overshot length', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue('121255512349999');

    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });
});
