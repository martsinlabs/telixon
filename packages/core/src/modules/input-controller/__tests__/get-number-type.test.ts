import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_MOBILE_INTL = '1' + US_MOBILE;
const US_TOLL_FREE = getExampleNumber('US', 'TOLL_FREE');
const US_PREMIUM_RATE = getExampleNumber('US', 'PREMIUM_RATE');
const GB_MOBILE_WITH_PREFIX = '0' + getExampleNumber('GB', 'MOBILE');
const DE_FIXED_WITH_PREFIX = '0' + getExampleNumber('DE', 'FIXED_LINE');

describe('PhoneNumber.getNumberType: national', () => {
  it('returns null for empty input', () => {
    const controller = createNationalInputController({ region: 'US' });

    expect(controller.getPhoneNumber().getNumberType()).toBeNull();
  });

  it('returns null for partial input (length not yet valid)', () => {
    const controller = createNationalInputController({ region: 'US' });
    controller.setValue('21255');

    expect(controller.getPhoneNumber().getNumberType()).toBeNull();
  });

  it('collapses FIXED_LINE + MOBILE into FIXED_LINE_OR_MOBILE for a US geographic number', () => {
    const controller = createNationalInputController({ region: 'US' });
    controller.setValue(US_MOBILE);

    expect(controller.getPhoneNumber().getNumberType()).toBe('FIXED_LINE_OR_MOBILE');
  });

  it('returns TOLL_FREE for a US 800 number', () => {
    const controller = createNationalInputController({ region: 'US' });
    controller.setValue(US_TOLL_FREE);

    expect(controller.getPhoneNumber().getNumberType()).toBe('TOLL_FREE');
  });

  it('returns MOBILE for a GB mobile number', () => {
    const controller = createNationalInputController({ region: 'GB' });
    controller.setValue(GB_MOBILE_WITH_PREFIX);

    expect(controller.getPhoneNumber().getNumberType()).toBe('MOBILE');
  });

  it('returns FIXED_LINE for a DE geographic number', () => {
    const controller = createNationalInputController({ region: 'DE' });
    controller.setValue(DE_FIXED_WITH_PREFIX);

    expect(controller.getPhoneNumber().getNumberType()).toBe('FIXED_LINE');
  });

  it('returns PREMIUM_RATE for a US 900 number', () => {
    const controller = createNationalInputController({ region: 'US' });
    controller.setValue(US_PREMIUM_RATE);

    expect(controller.getPhoneNumber().getNumberType()).toBe('PREMIUM_RATE');
  });

  it('returns null for a length-valid but pattern-bogus number', () => {
    const controller = createNationalInputController({ region: 'US' });
    controller.setValue('0001234567');

    expect(controller.getPhoneNumber().getNumberType()).toBeNull();
  });
});

describe('PhoneNumber.getNumberType: respects active number-type filter', () => {
  it('narrows FIXED_LINE_OR_MOBILE to MOBILE when only MOBILE is allowed', () => {
    const controller = createNationalInputController({ region: 'US' });
    controller.setNumberTypeFilter(['MOBILE']);
    controller.setValue(US_MOBILE);

    expect(controller.getPhoneNumber().getNumberType()).toBe('MOBILE');
  });

  it('returns null for a landline when only MOBILE is allowed', () => {
    const controller = createNationalInputController({ region: 'DE' });
    controller.setNumberTypeFilter(['MOBILE']);
    controller.setValue(DE_FIXED_WITH_PREFIX);

    expect(controller.getPhoneNumber().getNumberType()).toBeNull();
  });
});

describe('PhoneNumber.getNumberType: international', () => {
  it('returns null before a full number resolves', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue('1212');

    expect(controller.getPhoneNumber().getNumberType()).toBeNull();
  });

  it('resolves a full international US number to FIXED_LINE_OR_MOBILE', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue(US_MOBILE_INTL);

    expect(controller.getPhoneNumber().getNumberType()).toBe('FIXED_LINE_OR_MOBILE');
  });
});

describe('PhoneNumber.getNumberType: returns FIXED_LINE_OR_MOBILE for numbers valid as fixed line and mobile', () => {
  it.each([
    ['+917410410123', 'IN'],
    ['+18765230123', 'JM'],
    ['+21630010123', 'TN'],
    ['+998669050123', 'UZ'],
  ])('classifies %s (%s) as FIXED_LINE_OR_MOBILE', (e164) => {
    const controller = createInternationalInputController({});
    controller.setValue(e164);

    expect(controller.getPhoneNumber().getNumberType()).toBe('FIXED_LINE_OR_MOBILE');
  });
});

describe('PhoneNumber.getNumberType: classifies service and special-rate numbers', () => {
  it.each([
    ['+9513331234', 'VOIP'],
    ['+508800012345', 'TOLL_FREE'],
    ['+508810123456', 'PREMIUM_RATE'],
  ])('classifies %s as %s', (e164, expected) => {
    const controller = createInternationalInputController({});
    controller.setValue(e164);

    expect(controller.getPhoneNumber().getNumberType()).toBe(expected);
  });
});

describe('PhoneNumber.getNumberType: after undo', () => {
  it('returns the type of the restored state', () => {
    const controller = createNationalInputController({ region: 'US' });
    controller.setValue(US_MOBILE);
    controller.setValue('');
    controller.undo();

    expect(controller.getPhoneNumber().getNumberType()).toBe('FIXED_LINE_OR_MOBILE');
  });
});
