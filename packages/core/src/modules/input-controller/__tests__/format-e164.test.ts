import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_MOBILE_E164 = '+1' + US_MOBILE;
const US_MOBILE_NATIONAL = '(201) 555-0123';
const GB_MOBILE_WITH_PREFIX = '0' + getExampleNumber('GB', 'MOBILE');
const GB_MOBILE_E164 = '+44' + getExampleNumber('GB', 'MOBILE');

describe('PhoneNumber.formatE164: national', () => {
  it('returns null while the number is incomplete', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('21255');

    expect(controller.getPhoneNumber().formatE164()).toBeNull();
  });

  it('returns the canonical E.164 for a valid number', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue(US_MOBILE);

    expect(controller.getPhoneNumber().formatE164()).toBe(US_MOBILE_E164);
  });

  it('drops the national prefix before assembling E.164', () => {
    const controller = createNationalInputController({ country: 'GB' });
    controller.setValue(GB_MOBILE_WITH_PREFIX);

    expect(controller.getPhoneNumber().formatE164()).toBe(GB_MOBILE_E164);
  });
});

describe('PhoneNumber.formatE164: international', () => {
  it('returns null for calling-code only', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1');

    expect(controller.getPhoneNumber().formatE164()).toBeNull();
  });

  it('returns the canonical E.164 for a full number', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1 ' + US_MOBILE_NATIONAL);

    expect(controller.getPhoneNumber().formatE164()).toBe(US_MOBILE_E164);
  });
});
