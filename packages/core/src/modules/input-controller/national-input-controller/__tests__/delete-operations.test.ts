import { describe, expect, it } from 'vitest';
import { createNationalInputController } from '..';

// AR mobile baseline: raw "0111534343444" (13 digits) → formatted "011 15-3434-3444" (16 chars).
const AR_RAW = '0111534343444';
const AR_FORMATTED = '011 15-3434-3444';

describe('NationalInputController.deleteBackward', () => {
  it('is a no-op when caret is at position 0', () => {
    const controller = createNationalInputController({ country: 'AR' });
    controller.setValue(AR_RAW);

    const state = controller.deleteBackward(AR_FORMATTED, 0, 0);

    expect(state.value).toBe(AR_FORMATTED);
    expect(state.selectionStart).toBe(0);
    expect(state.selectionEnd).toBe(0);
  });

  it('snaps caret past a formatting char without deleting a digit (caret just after "011 ")', () => {
    const controller = createNationalInputController({ country: 'AR' });
    controller.setValue(AR_RAW);
    // Position 4 is right after "011 " — char at index 3 is the space.
    const state = controller.deleteBackward(AR_FORMATTED, 4, 4);

    expect(state.value).toBe(AR_FORMATTED);
    expect(state.selectionStart).toBe(3);
    expect(state.selectionEnd).toBe(3);
  });

  it('removes the last digit and trims trailing formatting (direction backward)', () => {
    const controller = createNationalInputController({ country: 'AR' });
    controller.setValue(AR_RAW);

    const state = controller.deleteBackward(AR_FORMATTED, AR_FORMATTED.length, AR_FORMATTED.length);

    // 12 digits should re-format to "011 15-3434-344" (no trailing formatter).
    expect(state.value.replace(/\D/g, '')).toBe(AR_RAW.slice(0, -1));
    expect(state.value.endsWith('4')).toBe(true);
    expect(state.selectionStart).toBe(state.value.length);
  });

  it('deletes a selection range and reformats from the remaining digits', () => {
    const controller = createNationalInputController({ country: 'AR' });
    controller.setValue(AR_RAW);
    // Delete the slice "15-3434" (positions 4..11), 6 digits removed.
    const state = controller.deleteBackward(AR_FORMATTED, 4, 11);

    expect(state.value.replace(/\D/g, '')).toBe('0113444');
  });
});

describe('NationalInputController.deleteForward', () => {
  it('snaps caret forward past a formatting char (caret on the space at index 3)', () => {
    const controller = createNationalInputController({ country: 'AR' });
    controller.setValue(AR_RAW);
    const state = controller.deleteForward(AR_FORMATTED, 3, 3);

    expect(state.value).toBe(AR_FORMATTED);
    // Caret should jump to the next digit position (index 4).
    expect(state.selectionStart).toBe(4);
  });

  it('is a no-op when caret is at the end of the value', () => {
    const controller = createNationalInputController({ country: 'AR' });
    const seeded = controller.setValue(AR_RAW);
    const state = controller.deleteForward(seeded.value, seeded.value.length, seeded.value.length);

    expect(state.value).toBe(AR_FORMATTED);
    expect(state.selectionStart).toBe(AR_FORMATTED.length);
  });

  it('removes the first digit when caret is at position 0', () => {
    const controller = createNationalInputController({ country: 'AR' });
    controller.setValue(AR_RAW);
    const state = controller.deleteForward(AR_FORMATTED, 0, 0);

    // First digit '0' removed → remaining 12 digits re-format. Without the trunk-prefix '0',
    // AR may resolve to a different format; the contract here is "the leading 0 is gone".
    expect(state.value.replace(/\D/g, '')).toBe(AR_RAW.slice(1));
  });

  it('deletes a selection range and reformats from the remaining digits', () => {
    const controller = createNationalInputController({ country: 'AR' });
    controller.setValue(AR_RAW);
    const state = controller.deleteForward(AR_FORMATTED, 4, 11);

    expect(state.value.replace(/\D/g, '')).toBe('0113444');
  });
});
