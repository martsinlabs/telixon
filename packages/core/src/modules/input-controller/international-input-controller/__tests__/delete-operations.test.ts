import { getExampleNumber } from '@telixon/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '..';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_MOBILE_INTL = '1' + US_MOBILE;

describe('InternationalInputController.deleteBackward', () => {
  it('snaps caret past the trailing space separator when no national digits exist (structural)', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    // Initial value: '1 '. Caret at 2 (end). Char at index 1 is the calling-code separator.
    // The separator is structurally re-added on resolve, so backspace cannot remove it
    // caret snaps back to the position right after the calling-code digit instead.
    const state = controller.deleteBackward('1 ', 2, 2);

    expect(state.value).toBe('1 ');
    expect(state.selectionStart).toBe(1);
  });

  it('strips trailing formatting after a partial national number without losing a digit', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    const seeded = controller.setValue('1212');
    const valueWithTrailingFormatter = `${seeded.value}-`;
    const caret = valueWithTrailingFormatter.length;

    const state = controller.deleteBackward(valueWithTrailingFormatter, caret, caret);

    // All four national digits remain; only the trailing dash is removed.
    expect(state.value.replace(/\D/g, '')).toBe('1212');
    expect(state.value.endsWith('-')).toBe(false);
    expect(state.selectionStart).toBe(state.value.length);
  });

  it('deletes the last digit from a full US number with calling code shown', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    const seeded = controller.setValue(US_MOBILE_INTL);

    const state = controller.deleteBackward(seeded.value, seeded.value.length, seeded.value.length);

    expect(state.value.replace(/\D/g, '')).toBe(US_MOBILE_INTL.slice(0, -1));
  });

  it('does not jump the caret over the "+" prefix when backspacing right after it', () => {
    const controller = createInternationalInputController({
      defaultCountry: 'US',
      display: { callingCodeInInput: true, plusPrefix: true },
    });
    // Value is "+1 ". Place caret right after "+" (position 1).
    const state = controller.deleteBackward('+1 ', 1, 1);

    expect(state.value).toBe('+1 ');
    // Caret stays anchored on the "+" side instead of snapping to position 0.
    expect(state.selectionStart).toBe(1);
    expect(state.selectionEnd).toBe(1);
  });

  it('deletes the last digit when callingCodeInInput is false (national-only display)', () => {
    const controller = createInternationalInputController({
      defaultCountry: 'US',
      display: { callingCodeInInput: false },
    });
    const seeded = controller.setValue(US_MOBILE);

    const state = controller.deleteBackward(seeded.value, seeded.value.length, seeded.value.length);

    expect(state.value.replace(/\D/g, '')).toBe(US_MOBILE.slice(0, -1));
    // Calling code never appears in the value with this display mode.
    expect(state.value.startsWith('1')).toBe(false);
  });
});

describe('InternationalInputController.deleteForward', () => {
  it('removes the first digit of national number from a full US value', () => {
    const controller = createInternationalInputController({ defaultCountry: 'US' });
    const seeded = controller.setValue(US_MOBILE_INTL);

    // Skip past the calling code segment "1 " to land on the first national digit.
    const firstNationalDigit: string = US_MOBILE.charAt(0);
    const callingSegmentLength = seeded.value.indexOf(firstNationalDigit);
    const state = controller.deleteForward(seeded.value, callingSegmentLength, callingSegmentLength);

    // First national digit is dropped; remaining digits are calling code + NSN without first digit.
    expect(state.value.replace(/\D/g, '')).toBe('1' + US_MOBILE.slice(1));
  });
});
