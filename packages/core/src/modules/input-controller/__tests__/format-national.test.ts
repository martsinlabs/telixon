import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_MOBILE_NATIONAL = '(201) 555-0123';
const GB_MOBILE = getExampleNumber('GB', 'MOBILE');
const GB_MOBILE_WITH_PREFIX = '0' + GB_MOBILE;
const GB_MOBILE_NATIONAL = '07400 123456';

describe('PhoneNumber.formatNational: national', () => {
  it('returns null while the number is not yet possible', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue('21255');

    expect(controller.getPhoneNumber().formatNational()).toBeNull();
  });

  it('groups a valid US number without adding a prefix', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue(US_MOBILE);

    expect(controller.getPhoneNumber().formatNational()).toBe(US_MOBILE_NATIONAL);
  });

  it('reconstructs the national prefix from the format rule', () => {
    const controller = createNationalInputController({ defaultRegion: 'GB' });
    controller.setValue(GB_MOBILE_WITH_PREFIX);

    expect(controller.getPhoneNumber().formatNational()).toBe(GB_MOBILE_NATIONAL);
  });

  it('formats a possible-but-invalid number', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue('3101234434');

    expect(controller.getPhoneNumber().formatNational()).toBe('(310) 123-4434');
  });
});

describe('PhoneNumber.formatNational: international', () => {
  it('returns null for calling-code only', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1');

    expect(controller.getPhoneNumber().formatNational()).toBeNull();
  });

  it('groups a full number in national form', () => {
    const controller = createInternationalInputController({});
    controller.setValue('+1 ' + US_MOBILE_NATIONAL);

    expect(controller.getPhoneNumber().formatNational()).toBe(US_MOBILE_NATIONAL);
  });
});
