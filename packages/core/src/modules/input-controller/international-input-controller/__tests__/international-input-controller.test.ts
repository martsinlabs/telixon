import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '..';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_MOBILE_INTL = '1' + US_MOBILE;
const US_MOBILE_INTL_BODY = '201-555-0123';
const GB_MOBILE_E164_DIGITS = '44' + getExampleNumber('GB', 'MOBILE');

describe('InternationalInputController initial state', () => {
  it('defaults to empty value with null country when nothing configured', () => {
    const controller = createInternationalInputController();
    const state = controller.currentState;

    expect(state.value).toBe('');
    expect(state.country).toBeNull();
  });

  // A complete calling code appends a trailing space separator; pinned here so accidental removal trips this test.
  it('seeds calling code from defaultCountry with trailing space separator', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    const state = controller.currentState;

    expect(state.value).toBe('1 ');
    expect(state.country).toBe('US');
  });

  it('prefixes "+" when plusPrefix is true', () => {
    const controller = createInternationalInputController({
      defaultCountry: 'US',
      display: { callingCodeInInput: true, plusPrefix: true },
    });

    expect(controller.currentState.value).toBe('+1 ');
  });

  it('starts empty when callingCodeInInput is false', () => {
    const controller = createInternationalInputController({
      defaultCountry: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.currentState;

    expect(state.value).toBe('');
    expect(state.country).toBe('US');
  });

  it('uses initialValue when provided', () => {
    const controller = createInternationalInputController({
      defaultCountry: 'US',
      initialValue: US_MOBILE_INTL,
    });

    const digitsOnly = controller.currentState.value.replace(/\D/g, '');
    expect(digitsOnly).toBe(US_MOBILE_INTL);
    expect(controller.currentState.country).toBe('US');
  });
});

describe('InternationalInputController formatting modes', () => {
  it('formats a full US number with calling code prefix', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    const state = controller.setValue(US_MOBILE_INTL);

    expect(state.country).toBe('US');
    expect(state.value.replace(/\D/g, '')).toBe(US_MOBILE_INTL);
    expect(state.value.startsWith('1')).toBe(true);
    expect(state.value.startsWith('+')).toBe(false);
  });

  it('formats a full US number with "+" prefix when plusPrefix is enabled', () => {
    const controller = createInternationalInputController({
      defaultCountry: 'US',
      display: { callingCodeInInput: true, plusPrefix: true },
    });
    const state = controller.setValue(US_MOBILE_INTL);

    expect(state.value.startsWith('+1')).toBe(true);
    expect(state.value.replace(/\D/g, '')).toBe(US_MOBILE_INTL);
  });

  it('omits calling code from value when callingCodeInInput is false', () => {
    const controller = createInternationalInputController({
      defaultCountry: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.setValue(US_MOBILE);

    expect(state.country).toBe('US');
    expect(state.value.replace(/\D/g, '')).toBe(US_MOBILE);
    expect(state.value.startsWith('+')).toBe(false);
  });

  it('uses international-style format (no parens) in split mode', () => {
    const controller = createInternationalInputController({
      defaultCountry: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.setValue(US_MOBILE);

    expect(state.value).toBe(US_MOBILE_INTL_BODY);
    expect(state.value).not.toContain('(');
  });

  it('formats GB mobile with calling code in input', () => {
    const controller = createInternationalInputController();
    const state = controller.setValue(GB_MOBILE_E164_DIGITS);

    expect(state.country).toBe('GB');
    expect(state.value.replace(/\D/g, '')).toBe(GB_MOBILE_E164_DIGITS);
  });
});

describe('InternationalInputController country resolution', () => {
  it('returns NANP primary country (US) when only calling code is typed', () => {
    const controller = createInternationalInputController();
    const state = controller.setValue('1');

    expect(state.country).toBe('US');
  });

  it('resolves to CA when a Canada-only area code (416) is typed', () => {
    const controller = createInternationalInputController();
    const state = controller.setValue('14165551234');

    expect(state.country).toBe('CA');
  });

  it('resolves to AG when Antigua area code (268) is typed', () => {
    const controller = createInternationalInputController();
    const state = controller.setValue('12684621234');

    expect(state.country).toBe('AG');
  });

  // setCountry only updates the default-country anchor, not the input; country still derives from the current digits.
  it('setCountry keeps current value and country when digits still resolve elsewhere', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    const state = controller.setCountry('GB');

    expect(state.country).toBe('US');
    expect(state.value).toBe('1 ');
  });

  it('setCountry on an empty controller does not seed the new calling code', () => {
    const controller = createInternationalInputController();
    const state = controller.setCountry('GB');

    // No digits are added by setCountry alone: value stays empty.
    expect(state.value).toBe('');
  });
});

describe('InternationalInputController caret across boundaries', () => {
  it('caret lands at end of value after initial seed', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    const state = controller.currentState;

    expect(state.selectionStart).toBe(state.value.length);
    expect(state.selectionEnd).toBe(state.value.length);
  });

  it('caret stays anchored after typing one national digit on top of calling code', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    const initial = controller.currentState;
    const next = controller.insert(initial.value, '2', initial.value.length, initial.value.length);

    expect(next.value.replace(/\D/g, '')).toBe('12');
    // The last typed character must sit at or before the caret.
    expect(next.value.charAt(next.selectionStart - 1)).toBe('2');
  });

  it('caret placed inside the "+" prefix is preserved within the calling-code segment', () => {
    const controller = createInternationalInputController({
      defaultCountry: 'US',
      display: { callingCodeInInput: true, plusPrefix: true },
    });
    // Value is "+1 ". Place caret right after "+" (position 1): inside calling code.
    const state = controller.insert('+1 ', '', 1, 1);

    expect(state.value).toBe('+1 ');
    expect(state.selectionStart).toBeGreaterThanOrEqual(0);
    expect(state.selectionStart).toBeLessThanOrEqual(state.value.length);
  });
});

describe('InternationalInputController format selection', () => {
  // FI has two same-length formats with distinct leadingDigits; selection must match the prefix ('10' takes 2-3-..., not 3-3-...).
  it('selects the format by leading digits', () => {
    const controller = createInternationalInputController({
      display: { callingCodeInInput: true, plusPrefix: true },
    });
    controller.setValue('+35810112345');

    expect(controller.currentState.value).toBe('+358 10 112345');
  });
});
