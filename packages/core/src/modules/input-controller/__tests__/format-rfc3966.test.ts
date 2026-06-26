import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_MOBILE_URI = 'tel:+1-201-555-0123';
const GB_MOBILE_WITH_PREFIX = '0' + getExampleNumber('GB', 'MOBILE');
const GB_MOBILE_URI = 'tel:+44-7400-123456';
const US_MOBILE_NATIONAL = '(201) 555-0123';

describe('PhoneNumber.formatRfc3966: national', () => {
  it('returns null while the number is incomplete', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue('21255');

    expect(controller.getPhoneNumber().formatRfc3966()).toBeNull();
  });

  it('returns the RFC3966 tel: URI for a valid number', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue(US_MOBILE);

    expect(controller.getPhoneNumber().formatRfc3966()).toBe(US_MOBILE_URI);
  });

  it('drops the national prefix before assembling the URI', () => {
    const controller = createNationalInputController({ defaultRegion: 'GB' });
    controller.setValue(GB_MOBILE_WITH_PREFIX);

    expect(controller.getPhoneNumber().formatRfc3966()).toBe(GB_MOBILE_URI);
  });
});

describe('PhoneNumber.formatRfc3966: international', () => {
  it('returns null for calling-code only', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1');

    expect(controller.getPhoneNumber().formatRfc3966()).toBeNull();
  });

  it('returns the RFC3966 tel: URI for a full number', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1 ' + US_MOBILE_NATIONAL);

    expect(controller.getPhoneNumber().formatRfc3966()).toBe(US_MOBILE_URI);
  });
});
