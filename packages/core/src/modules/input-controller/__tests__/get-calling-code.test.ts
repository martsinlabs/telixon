import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

const GB_FIXED_E164 = '+44' + getExampleNumber('GB', 'FIXED_LINE');

describe('PhoneNumber.getCallingCode: national', () => {
  it("returns the bound region's calling code, even when empty", () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });

    expect(controller.getPhoneNumber().getCallingCode()).toBe('1');
  });

  it('returns the multi-digit calling code for the bound region', () => {
    const controller = createNationalInputController({ defaultRegion: 'GB' });

    expect(controller.getPhoneNumber().getCallingCode()).toBe('44');
  });
});

describe('PhoneNumber.getCallingCode: international', () => {
  it('returns null before a calling code resolves', () => {
    const controller = createInternationalInputController({});

    expect(controller.getPhoneNumber().getCallingCode()).toBeNull();
  });

  it('resolves the calling code from the typed digits', () => {
    const controller = createInternationalInputController({});
    controller.setValue(GB_FIXED_E164);

    expect(controller.getPhoneNumber().getCallingCode()).toBe('44');
  });

  it('resolves the calling code before the national number is complete', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1');

    expect(controller.getPhoneNumber().getCallingCode()).toBe('1');
  });
});
