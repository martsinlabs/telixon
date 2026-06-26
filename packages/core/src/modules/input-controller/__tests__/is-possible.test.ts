import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

const US_MOBILE = getExampleNumber('US', 'MOBILE');

describe('InputController.isPossibleWithReason: national', () => {
  it('returns TOO_SHORT for empty input', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });

    expect(controller.getPhoneNumber().isPossibleWithReason()).toBe('TOO_SHORT');
  });

  it('returns TOO_SHORT for partial input', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue('21255');

    expect(controller.getPhoneNumber().isPossibleWithReason()).toBe('TOO_SHORT');
  });

  it('returns IS_POSSIBLE at a valid length', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue(US_MOBILE);

    expect(controller.getPhoneNumber().isPossibleWithReason()).toBe('IS_POSSIBLE');
  });

  it('returns IS_POSSIBLE for length-only match: pattern is ignored (bogus area code)', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue('0001234567');

    expect(controller.getPhoneNumber().isPossibleWithReason()).toBe('IS_POSSIBLE');
  });

  it('returns TOO_LONG for digits past max', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue('212555123499999');

    expect(controller.getPhoneNumber().isPossibleWithReason()).toBe('TOO_LONG');
  });

  it('returns TOO_SHORT when the value is shorter than the filtered type allows', () => {
    const controller = createNationalInputController({ defaultRegion: 'DE' });
    controller.setNumberTypeFilter(['PAGER']);
    controller.setValue('030');

    expect(controller.getPhoneNumber().isPossibleWithReason()).toBe('TOO_SHORT');
  });
});

describe('InputController.isPossibleWithReason: local-only length', () => {
  it('returns IS_POSSIBLE_LOCAL_ONLY for a local-only number', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+43123');

    expect(controller.getPhoneNumber().isPossibleWithReason()).toBe('IS_POSSIBLE_LOCAL_ONLY');
  });

  it('checks length against the calling code primary region, not the resolved region', () => {
    // +1 length 7 is local-only for the primary region (US); CA's 7-digit UAN must not make it national.
    const controller = createInternationalInputController({});
    controller.setValue('+13101234');

    expect(controller.getPhoneNumber().isPossibleWithReason()).toBe('IS_POSSIBLE_LOCAL_ONLY');
  });
});

describe('InputController.isPossible: boolean wrapper', () => {
  it('returns true for possible numbers, including local-only', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });

    controller.setValue('21255');
    expect(controller.getPhoneNumber().isPossible()).toBe(false);

    controller.setValue(US_MOBILE);
    expect(controller.getPhoneNumber().isPossible()).toBe(true);

    controller.setValue('0001234567');
    expect(controller.getPhoneNumber().isPossible()).toBe(true);
  });

  it('counts a local-only number as possible', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+43123');

    expect(controller.getPhoneNumber().isPossible()).toBe(true);
  });
});

describe('InputController.isPossibleWithReason: international', () => {
  it('returns INVALID_CALLING_CODE before any calling code resolves', () => {
    const controller = createInternationalInputController({});

    expect(controller.getPhoneNumber().isPossibleWithReason()).toBe('INVALID_CALLING_CODE');
  });

  it('returns TOO_SHORT once calling code resolves but digits are short', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue('1212');

    expect(controller.getPhoneNumber().isPossibleWithReason()).toBe('TOO_SHORT');
  });

  it('returns IS_POSSIBLE for a full international number', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue('1' + US_MOBILE);

    expect(controller.getPhoneNumber().isPossibleWithReason()).toBe('IS_POSSIBLE');
  });

  it('returns TOO_LONG past max', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue('121255512349999');

    expect(controller.getPhoneNumber().isPossibleWithReason()).toBe('TOO_LONG');
  });
});
