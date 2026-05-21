import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

describe('PhoneNumber.getNumberType — national', () => {
  it('returns null for empty input', () => {
    const controller = createNationalInputController({ country: 'US' });

    expect(controller.getPhoneNumber().getNumberType()).toBeNull();
  });

  it('returns null for partial input (length not yet valid)', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('21255');

    expect(controller.getPhoneNumber().getNumberType()).toBeNull();
  });

  it('collapses FIXED_LINE + MOBILE into FIXED_LINE_OR_MOBILE for a US geographic number', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('2125551234');

    expect(controller.getPhoneNumber().getNumberType()).toBe('FIXED_LINE_OR_MOBILE');
  });

  it('returns TOLL_FREE for a US 800 number', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('8005550123');

    expect(controller.getPhoneNumber().getNumberType()).toBe('TOLL_FREE');
  });

  it('returns MOBILE for a GB mobile number', () => {
    const controller = createNationalInputController({ country: 'GB' });
    controller.setValue('07911123456');

    expect(controller.getPhoneNumber().getNumberType()).toBe('MOBILE');
  });

  it('returns FIXED_LINE for a DE geographic number', () => {
    const controller = createNationalInputController({ country: 'DE' });
    controller.setValue('03012345678');

    expect(controller.getPhoneNumber().getNumberType()).toBe('FIXED_LINE');
  });

  it('returns PREMIUM_RATE for a US 900 number', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('9005550123');

    expect(controller.getPhoneNumber().getNumberType()).toBe('PREMIUM_RATE');
  });

  it('returns null for a length-valid but pattern-bogus number', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('0001234567');

    expect(controller.getPhoneNumber().getNumberType()).toBeNull();
  });
});

describe('PhoneNumber.getNumberType — respects active number-type filter', () => {
  it('narrows FIXED_LINE_OR_MOBILE to MOBILE when only MOBILE is allowed', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setNumberTypeFilter(['MOBILE']);
    controller.setValue('2125551234');

    expect(controller.getPhoneNumber().getNumberType()).toBe('MOBILE');
  });

  it('returns null for a landline when only MOBILE is allowed', () => {
    const controller = createNationalInputController({ country: 'DE' });
    controller.setNumberTypeFilter(['MOBILE']);
    controller.setValue('03012345678');

    expect(controller.getPhoneNumber().getNumberType()).toBeNull();
  });
});

describe('PhoneNumber.getNumberType — international', () => {
  it('returns null before a full number resolves', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    controller.setValue('1212');

    expect(controller.getPhoneNumber().getNumberType()).toBeNull();
  });

  it('resolves a full international US number to FIXED_LINE_OR_MOBILE', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    controller.setValue('12125551234');

    expect(controller.getPhoneNumber().getNumberType()).toBe('FIXED_LINE_OR_MOBILE');
  });
});

describe('PhoneNumber.getNumberType — returns FIXED_LINE_OR_MOBILE for numbers valid as fixed line and mobile', () => {
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

describe('PhoneNumber.getNumberType — classifies service and special-rate numbers', () => {
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

describe('PhoneNumber.getNumberType — after undo', () => {
  it('returns the type of the restored state', () => {
    const controller = createNationalInputController({ country: 'US' });
    controller.setValue('2125551234');
    controller.setValue('');
    controller.undo();

    expect(controller.getPhoneNumber().getNumberType()).toBe('FIXED_LINE_OR_MOBILE');
  });
});
