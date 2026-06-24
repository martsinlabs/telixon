import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const GB_FIXED_WITH_PREFIX = '0' + getExampleNumber('GB', 'FIXED_LINE');
const GB_FIXED_E164 = '+44' + getExampleNumber('GB', 'FIXED_LINE');

describe('PhoneNumber.getRegion: national', () => {
  it('returns the configured region for a valid number', () => {
    const controller = createNationalInputController({ region: 'US' });
    controller.setValue(US_MOBILE);

    expect(controller.getPhoneNumber().getRegion()).toBe('US');
  });

  it('returns the region for a geographic landline', () => {
    const controller = createNationalInputController({ region: 'GB' });
    controller.setValue(GB_FIXED_WITH_PREFIX);

    expect(controller.getPhoneNumber().getRegion()).toBe('GB');
  });
});

describe('PhoneNumber.getRegion: international', () => {
  it('returns null before anything resolves', () => {
    const controller = createInternationalInputController({});

    expect(controller.getPhoneNumber().getRegion()).toBeNull();
  });

  it('resolves the region from a full international number', () => {
    const controller = createInternationalInputController({});
    controller.setValue(GB_FIXED_E164);

    expect(controller.getPhoneNumber().getRegion()).toBe('GB');
  });
});
