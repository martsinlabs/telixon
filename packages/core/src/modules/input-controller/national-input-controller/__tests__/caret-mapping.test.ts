import { RegionCode } from '@telixon/core/engine';
import { describe, expect, it } from 'vitest';
import { createNationalInputController } from '..';
import { InputState } from '../../models';

function placeCaretInRaw(region: RegionCode, raw: string, caret: number): InputState {
  const controller = createNationalInputController({ defaultRegion: region });

  return controller.insert(raw, '', caret, caret);
}

describe('national controller caret mapping', () => {
  describe('AR mobile (normalization strips and inserts digits)', () => {
    const RAW = '0111523456789';
    const FORMATTED = '011 15-2345-6789';

    it.each([
      { name: 'before national prefix', rawCaret: 0, formattedCaret: 0 },
      { name: 'after national prefix "0"', rawCaret: 1, formattedCaret: 1 },
      { name: 'inside area code "0|1|1"', rawCaret: 2, formattedCaret: 2 },
      { name: 'after area code, jumps past " "', rawCaret: 3, formattedCaret: 4 },
      { name: 'inside mobile indicator "1|5"', rawCaret: 4, formattedCaret: 5 },
      { name: 'after "15", jumps past "-"', rawCaret: 5, formattedCaret: 7 },
      { name: 'after subscriber digit 1', rawCaret: 6, formattedCaret: 8 },
      { name: 'after subscriber digit 2', rawCaret: 7, formattedCaret: 9 },
      { name: 'after subscriber digit 3', rawCaret: 8, formattedCaret: 10 },
      { name: 'after first 4-digit chunk, "-"', rawCaret: 9, formattedCaret: 12 },
      { name: 'after subscriber digit 5', rawCaret: 10, formattedCaret: 13 },
      { name: 'after subscriber digit 6', rawCaret: 11, formattedCaret: 14 },
      { name: 'after subscriber digit 7', rawCaret: 12, formattedCaret: 15 },
      { name: 'end of input', rawCaret: 13, formattedCaret: 16 },
    ])('$name: raw $rawCaret -> formatted $formattedCaret', ({ rawCaret, formattedCaret }) => {
      const state = placeCaretInRaw('AR', RAW, rawCaret);

      expect(state.value).toBe(FORMATTED);
      expect(state.selectionStart).toBe(formattedCaret);
      expect(state.selectionEnd).toBe(formattedCaret);
    });

    it('places caret at end after sequential typing', () => {
      const controller = createNationalInputController({ defaultRegion: 'AR' });
      let state: InputState = controller.currentState;

      for (let i = 0; i < RAW.length; i++) {
        state = controller.insert(state.value, RAW[i]!, state.selectionStart, state.selectionEnd);
      }

      expect(state.value).toBe(FORMATTED);
      expect(state.selectionStart).toBe(FORMATTED.length);
    });
  });

  describe('AR fixed-line (no normalization-induced caret drift)', () => {
    it('maps raw caret correctly through formatted separators', () => {
      const raw = '01133334444';
      const state = placeCaretInRaw('AR', raw, raw.length);

      expect(state.selectionStart).toBe(state.value.length);
    });
  });

  describe('US (parens grouping, the caret skips "(" ") " and "-")', () => {
    const RAW = '2015550123';
    const FORMATTED = '(201) 555-0123';

    it.each([
      { name: 'before the area code', rawCaret: 0, formattedCaret: 0 },
      { name: 'inside area code "(2|01"', rawCaret: 1, formattedCaret: 2 },
      { name: 'inside area code "(20|1"', rawCaret: 2, formattedCaret: 3 },
      { name: 'after area code, jumps past ") "', rawCaret: 3, formattedCaret: 6 },
      { name: 'after exchange digit 1', rawCaret: 4, formattedCaret: 7 },
      { name: 'after exchange digit 2', rawCaret: 5, formattedCaret: 8 },
      { name: 'after exchange, jumps past "-"', rawCaret: 6, formattedCaret: 10 },
      { name: 'after subscriber digit 1', rawCaret: 7, formattedCaret: 11 },
      { name: 'after subscriber digit 2', rawCaret: 8, formattedCaret: 12 },
      { name: 'after subscriber digit 3', rawCaret: 9, formattedCaret: 13 },
      { name: 'end of input', rawCaret: 10, formattedCaret: 14 },
    ])('$name: raw $rawCaret -> formatted $formattedCaret', ({ rawCaret, formattedCaret }) => {
      const state = placeCaretInRaw('US', RAW, rawCaret);

      expect(state.value).toBe(FORMATTED);
      expect(state.selectionStart).toBe(formattedCaret);
      expect(state.selectionEnd).toBe(formattedCaret);
    });

    it('places caret at end after sequential typing', () => {
      const controller = createNationalInputController({ defaultRegion: 'US' });
      let state: InputState = controller.currentState;

      for (let i = 0; i < RAW.length; i++) {
        state = controller.insert(state.value, RAW[i]!, state.selectionStart, state.selectionEnd);
      }

      expect(state.value).toBe(FORMATTED);
      expect(state.selectionStart).toBe(FORMATTED.length);
    });
  });
});

describe('national controller replace-selection (insert digits over a non-empty selection)', () => {
  it('replaces the selected area code with the inserted digits', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    const typed = controller.insert('', '2015550123', 0, 0);
    expect(typed.value).toBe('(201) 555-0123');

    // Select "(201) " (the area-code group) and type "415".
    const replaced = controller.insert(typed.value, '415', 0, 6);

    expect(replaced.value).toBe('(415) 555-0123');
  });

  it('replaces a fully selected value with a new number', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    const typed = controller.insert('', '2015550123', 0, 0);

    const replaced = controller.insert(typed.value, '4155550199', 0, typed.value.length);

    expect(replaced.value).toBe('(415) 555-0199');
  });
});
