import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '..';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_MOBILE_INTL = '1' + US_MOBILE;

function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

describe('InternationalInputController select-all overwrite', () => {
  it('consumes the selection when a "+" is typed over the whole value', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: true, plusPrefix: 'erasable' },
    });
    const seeded = controller.setValue('+' + US_MOBILE_INTL);

    const overwritten = controller.insert(seeded.value, '+', 0, seeded.value.length);

    expect(digitsOf(overwritten.value)).toBe('');
    expect(overwritten.value).toBe('+');

    const typed = controller.insert(overwritten.value, '3', 1, 1);
    expect(digitsOf(typed.value)).toBe('3');
  });

  it('consumes the selection when a letter is typed over the whole value', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const seeded = controller.setValue(US_MOBILE_INTL);

    const overwritten = controller.insert(seeded.value, 'x', 0, seeded.value.length);

    expect(digitsOf(overwritten.value)).toBe('');
  });
});

describe('InternationalInputController pasted calling-code dedupe', () => {
  it('drops the duplicated calling code when pasting a full number after the seeded code', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const seeded = controller.currentState;

    const pasted = controller.insert(seeded.value, '1 ' + US_MOBILE, seeded.value.length, seeded.value.length);

    expect(digitsOf(pasted.value)).toBe(US_MOBILE_INTL);
    expect(controller.getPhoneNumber().formatE164()).toBe('+' + US_MOBILE_INTL);
  });

  it('drops the duplicated calling code for a plus-prefixed paste', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const seeded = controller.currentState;

    const pasted = controller.insert(seeded.value, '+1 ' + US_MOBILE, seeded.value.length, seeded.value.length);

    expect(digitsOf(pasted.value)).toBe(US_MOBILE_INTL);
  });

  it('dedupes against the hidden seeded code when the calling code is not in the input', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });

    const pasted = controller.insert('', '1' + US_MOBILE, 0, 0);

    expect(digitsOf(pasted.value)).toBe(US_MOBILE);
    expect(controller.getPhoneNumber().formatE164()).toBe('+' + US_MOBILE_INTL);
  });

  it('keeps every digit when the national number legitimately starts with the code digits', () => {
    const controller = createInternationalInputController({ defaultRegion: 'IT' });
    const seeded = controller.currentState;

    const pasted = controller.insert(seeded.value, '3931234567', seeded.value.length, seeded.value.length);

    expect(digitsOf(pasted.value)).toBe('393931234567');
  });

  it('keeps every digit for inserts below the paste threshold', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const seeded = controller.currentState;

    const typed = controller.insert(seeded.value, '1201', seeded.value.length, seeded.value.length);

    expect(digitsOf(typed.value)).toBe('11201');
  });

  it('keeps every digit when the paste replaces the whole value', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const seeded = controller.currentState;

    const pasted = controller.insert(seeded.value, '1 ' + US_MOBILE, 0, seeded.value.length);

    expect(digitsOf(pasted.value)).toBe(US_MOBILE_INTL);
  });
});

describe('InternationalInputController region on dead prefixes', () => {
  it('reports null once the typed digits can no longer complete a calling code', () => {
    const controller = createInternationalInputController();

    expect(controller.setValue('+9991234567').region).toBeNull();
    expect(controller.setValue('+888').region).toBeNull();
    expect(controller.setValue('+80012345678').region).toBeNull();
  });

  it('keeps the resolved region for a completed calling code', () => {
    const controller = createInternationalInputController();

    expect(controller.setValue('+1').region).toBe('US');
    expect(controller.setValue('+44').region).toBe('GB');
  });
});

describe('InternationalInputController bad input', () => {
  it('treats a null value or text as empty instead of throwing', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });

    expect(() => controller.setValue(null as unknown as string)).not.toThrow();
    expect(digitsOf(controller.currentState.value)).toBe('');

    expect(() => controller.insert(null as unknown as string, null as unknown as string, 0, 0)).not.toThrow();
    expect(() => controller.deleteBackward(null as unknown as string, 1, 1)).not.toThrow();
    expect(() => controller.deleteForward(null as unknown as string, 0, 0)).not.toThrow();
  });
});
