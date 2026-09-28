import type { RegionCode } from '@telixon/core/engine';
import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '..';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_MOBILE_INTL = '1' + US_MOBILE;
const US_MOBILE_INTL_BODY = '201-555-0123';
const GB_MOBILE_E164_DIGITS = '44' + getExampleNumber('GB', 'MOBILE');

describe('InternationalInputController initial state', () => {
  it('defaults to empty value with null region when nothing configured', () => {
    const controller = createInternationalInputController();
    const state = controller.currentState;

    expect(state.value).toBe('');
    expect(state.region).toBeNull();
  });

  // A complete calling code appends a trailing space separator; pinned here so accidental removal trips this test.
  it('seeds calling code from defaultRegion with trailing space separator', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const state = controller.currentState;

    expect(state.value).toBe('1 ');
    expect(state.region).toBe('US');
  });

  it(`prefixes '+' when plusPrefix is 'fixed'`, () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: true, plusPrefix: 'fixed' },
    });

    expect(controller.currentState.value).toBe('+1 ');
  });

  it('starts empty when callingCodeInInput is false', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.currentState;

    expect(state.value).toBe('');
    expect(state.region).toBe('US');
  });

  it('uses initialValue when provided', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      initialValue: US_MOBILE_INTL,
    });

    const digitsOnly = controller.currentState.value.replace(/\D/g, '');
    expect(digitsOnly).toBe(US_MOBILE_INTL);
    expect(controller.currentState.region).toBe('US');
  });
});

describe('InternationalInputController formatting modes', () => {
  it('formats a full US number with calling code prefix', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const state = controller.setValue(US_MOBILE_INTL);

    expect(state.region).toBe('US');
    expect(state.value.replace(/\D/g, '')).toBe(US_MOBILE_INTL);
    expect(state.value.startsWith('1')).toBe(true);
    expect(state.value.startsWith('+')).toBe(false);
  });

  it('formats a full US number with "+" prefix when plusPrefix is enabled', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: true, plusPrefix: 'fixed' },
    });
    const state = controller.setValue(US_MOBILE_INTL);

    expect(state.value.startsWith('+1')).toBe(true);
    expect(state.value.replace(/\D/g, '')).toBe(US_MOBILE_INTL);
  });

  it('omits calling code from value when callingCodeInInput is false', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.setValue(US_MOBILE);

    expect(state.region).toBe('US');
    expect(state.value.replace(/\D/g, '')).toBe(US_MOBILE);
    expect(state.value.startsWith('+')).toBe(false);
  });

  it('uses international-style format (no parens) in split mode', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.setValue(US_MOBILE);

    expect(state.value).toBe(US_MOBILE_INTL_BODY);
    expect(state.value).not.toContain('(');
  });

  it('formats GB mobile with calling code in input', () => {
    const controller = createInternationalInputController();
    const state = controller.setValue(GB_MOBILE_E164_DIGITS);

    expect(state.region).toBe('GB');
    expect(state.value.replace(/\D/g, '')).toBe(GB_MOBILE_E164_DIGITS);
  });

  it('re-setting the shown value is a fixed point after a delete trims the separator', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'FR',
      display: { callingCodeInInput: false },
    });
    const seeded = controller.setValue('26');
    const trimmed = controller.deleteBackward(seeded.value, seeded.value.length, seeded.value.length);

    // The backward render dropped the trailing separator; re-setting that value keeps it dropped.
    expect(controller.setValue(trimmed.value).value).toBe(trimmed.value);
  });
});

describe('InternationalInputController region resolution', () => {
  it('returns NANP primary region (US) when only calling code is typed', () => {
    const controller = createInternationalInputController();
    const state = controller.setValue('1');

    expect(state.region).toBe('US');
  });

  it('resolves to CA when a Canada-only area code (416) is typed', () => {
    const controller = createInternationalInputController();
    const state = controller.setValue('14165551234');

    expect(state.region).toBe('CA');
  });

  it('resolves to AG when Antigua area code (268) is typed', () => {
    const controller = createInternationalInputController();
    const state = controller.setValue('12684621234');

    expect(state.region).toBe('AG');
  });

  // A pick writes the region's calling code into the field and keeps the national digits.
  it('setRegion reseeds a field that holds only its calling code', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const state = controller.setRegion('GB');

    expect(state.value).toBe('44 ');
    expect(state.region).toBe('GB');
    expect(state.selectionStart).toBe(3);
  });

  it('setRegion seeds the calling code of an empty controller', () => {
    const controller = createInternationalInputController();
    const state = controller.setRegion('GB');

    expect(state.value).toBe('44 ');
    expect(state.region).toBe('GB');
  });

  it('setRegion settles a shared calling code on a field that holds only that code', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const state = controller.setRegion('CA');

    expect(state.value).toBe('1 ');
    expect(state.region).toBe('CA');
  });

  it('setRegion rewrites the calling code and keeps the national digits', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue('1415555');
    const state = controller.setRegion('GB');

    expect(state.value).toBe('44 415555');
    expect(state.region).toBe('GB');
  });

  it('setRegion keeps a whole number under its new calling code', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue('+1 416 555 0132');
    expect(controller.currentState.region).toBe('CA');

    const state = controller.setRegion('DE');

    expect(state.value).toBe('49 4165 550132');
    expect(state.region).toBe('DE');
  });

  it('undo after a rewriting setRegion restores the number', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue('+1 416 555 0132');
    controller.setRegion('GB');
    const state = controller.undo();

    expect(state.value).toBe('1 416-555-0132');
    expect(state.region).toBe('CA');
  });

  it('setRegion keeps the digits of a field whose calling code stays the same', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setValue('+1 416 555 0132');
    const state = controller.setRegion('CA');

    expect(state.value).toBe('1 416-555-0132');
    expect(state.region).toBe('CA');
  });

  it('setRegion keeps an erased plus erased', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: true, plusPrefix: 'erasable' },
    });
    const erased = controller.deleteBackward('+1 ', 1, 1);
    expect(erased.value).toBe('1 ');

    expect(controller.setRegion('GB').value).toBe('44 ');
  });

  it('setRegion replaces a partial calling code', () => {
    const controller = createInternationalInputController();
    controller.setValue('4');
    const state = controller.setRegion('AT');

    expect(state.value).toBe('43 ');
    expect(state.region).toBe('AT');
  });

  it('undo after a reseeding setRegion restores the previous seed', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    controller.setRegion('GB');
    const state = controller.undo();

    expect(state.value).toBe('1 ');
    expect(state.region).toBe('US');
  });

  it('setRegion keeps the plus of an erasable-plus field it reseeds', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: true, plusPrefix: 'erasable' },
    });
    const state = controller.setRegion('GB');

    expect(state.value).toBe('+44 ');
    expect(state.region).toBe('GB');
  });

  it('reports the default region while the field holds no digits', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });

    expect(controller.setValue('').region).toBe('US');
    expect(controller.setValue('+').region).toBe('US');
  });

  it('reports null for an empty field without a default region', () => {
    const controller = createInternationalInputController();

    expect(controller.currentState.region).toBe(null);
  });

  it('keeps null once digits are present and resolve nothing', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    // '0' opens no calling code, so the walk dies with a digit in the field.
    const state = controller.setValue('+0');

    expect(state.region).toBe(null);
  });
});

describe('InternationalInputController caret across boundaries', () => {
  it('caret lands at end of value after initial seed', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const state = controller.currentState;

    expect(state.selectionStart).toBe(state.value.length);
    expect(state.selectionEnd).toBe(state.value.length);
  });

  it('caret stays anchored after typing one national digit on top of calling code', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const initial = controller.currentState;
    const next = controller.insert(initial.value, '2', initial.value.length, initial.value.length);

    expect(next.value.replace(/\D/g, '')).toBe('12');
    // The last typed character must sit at or before the caret.
    expect(next.value.charAt(next.selectionStart - 1)).toBe('2');
  });

  it('caret placed inside the "+" prefix is preserved within the calling-code segment', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: true, plusPrefix: 'fixed' },
    });
    // Value is "+1 ". Place caret right after "+" (position 1): inside calling code.
    const state = controller.insert('+1 ', '', 1, 1);

    expect(state.value).toBe('+1 ');
    expect(state.selectionStart).toBe(1);
  });
});

describe('InternationalInputController format selection', () => {
  // FI has two same-length formats with distinct leadingDigits; selection must match the prefix ('10' takes 2-3-..., not 3-3-...).
  it('selects the format by leading digits', () => {
    const controller = createInternationalInputController({
      display: { callingCodeInInput: true, plusPrefix: 'fixed' },
    });
    controller.setValue('+35810112345');

    expect(controller.currentState.value).toBe('+358 10 112345');
  });
});

describe('InternationalInputController pasted international numbers', () => {
  const GB_MOBILE = getExampleNumber('GB', 'MOBILE');
  const GB_PASTE = '+44 ' + GB_MOBILE;

  it("moves a field with the calling code outside to the pasted number's region", () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.insert('', GB_PASTE, 0, 0);

    expect(state.region).toBe('GB');
    expect(state.value).toBe('7400 123456');
    expect(controller.getPhoneNumber().formatE164()).toBe('+44' + GB_MOBILE);
  });

  it('replaces typed digits with the pasted number in the outside mode', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const typed = controller.setValue('415');
    const state = controller.insert(typed.value, GB_PASTE, typed.value.length, typed.value.length);

    expect(state.region).toBe('GB');
    expect(state.value).toBe('7400 123456');
  });

  it("resolves a shared calling code to the pasted number's owner", () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.insert('', '+1 ' + getExampleNumber('CA', 'MOBILE'), 0, 0);

    expect(state.region).toBe('CA');
    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });

  it("keeps the field's region for an incomplete paste under the same calling code", () => {
    const controller = createInternationalInputController({
      defaultRegion: 'CA',
      display: { callingCodeInInput: false },
    });
    const state = controller.insert('', '+1 41', 0, 0);

    expect(state.region).toBe('CA');
    expect(state.value).toBe('41');
  });

  it("takes an incomplete paste under another calling code to that code's main region", () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.insert('', '+44 74', 0, 0);

    expect(state.region).toBe('GB');
    expect(state.value).toBe('74');
  });

  it('leaves a paste the region filter rejects to the literal read', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    controller.setRegionFilter(['US']);
    const state = controller.insert('', GB_PASTE, 0, 0);

    expect(state.region).toBe('US');
    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('replaces the whole value with a paste after the seeded calling code', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const state = controller.insert('1 ', GB_PASTE, 2, 2);

    expect(state.value).toBe('44 7400 123456');
    expect(state.region).toBe('GB');
  });

  it('keeps the plus of a paste in an erasable-plus field', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: true, plusPrefix: 'erasable' },
    });
    const state = controller.insert('+1 ', GB_PASTE, 3, 3);

    expect(state.value).toBe('+44 7400 123456');
  });

  it('still restores an erased plus typed on its own', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: true, plusPrefix: 'erasable' },
    });
    const erased = controller.deleteBackward('+1 ', 1, 1);
    expect(erased.value).toBe('1 ');

    const restored = controller.insert(erased.value, '+', 0, 0);
    expect(restored.value).toBe('+1 ');
  });

  it('keeps a strict field on its own region', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      strict: true,
      display: { callingCodeInInput: false },
    });
    const state = controller.insert('', GB_PASTE, 0, 0);

    expect(state.region).toBe('US');
    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it("takes a number of a strict field's own region", () => {
    const controller = createInternationalInputController({
      defaultRegion: 'GB',
      strict: true,
      display: { callingCodeInInput: false },
    });
    const state = controller.insert('', GB_PASTE, 0, 0);

    expect(state.value).toBe('7400 123456');
    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });

  it('drops a written trunk prefix and an extension', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });

    expect(controller.insert('', '+44 (0)20 7183 8750', 0, 0).value).toBe('20 7183 8750');
    expect(controller.setValue('+44 20 7183 8750 ext. 123').value).toBe('20 7183 8750');
  });

  it('leaves a calling code without a national part to the edit path', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const typed = controller.setValue('415');
    const state = controller.insert(typed.value, '+1', typed.value.length, typed.value.length);

    expect(state.value).toBe('415-1');
    expect(state.region).toBe('US');
  });

  it('applies the paste rule to setValue', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.setValue(GB_PASTE);

    expect(state.region).toBe('GB');
    expect(state.value).toBe('7400 123456');
  });

  it('reads leading whitespace past before the plus', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.insert('', '  ' + GB_PASTE, 0, 0);

    expect(state.region).toBe('GB');
  });

  it('undo restores the value before the paste', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const typed = controller.setValue('415');
    controller.insert(typed.value, GB_PASTE, typed.value.length, typed.value.length);
    const state = controller.undo();

    expect(state.value).toBe(typed.value);
  });
});

describe('InternationalInputController setRegion with an unknown region', () => {
  it('keeps the field as it is', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const typed = controller.setValue('2015550123');
    const state = controller.setRegion('ZZ' as RegionCode);

    expect(state.value).toBe(typed.value);
    expect(state.region).toBe('US');
    expect(controller.getPhoneNumber().formatE164()).toBe('+12015550123');
  });

  it('keeps the seeded calling code of a field that shows it', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const state = controller.setRegion('ZZ' as RegionCode);

    expect(state.value).toBe('1 ');
    expect(state.region).toBe('US');
  });
});
