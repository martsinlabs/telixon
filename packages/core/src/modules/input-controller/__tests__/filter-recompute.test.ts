import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '../international-input-controller';
import { createNationalInputController } from '../national-input-controller';

// The filter setters re-render the current value; they must never act on the stored range selection.

describe('Filter recompute with a stored range selection', () => {
  it('keeps every digit and the selection after undo restores a range (international)', () => {
    const controller = createInternationalInputController({ defaultRegion: 'US' });
    const seeded = controller.setValue('12015550123');

    controller.deleteBackward(seeded.value, 2, 7);
    const restored = controller.undo();
    expect(restored.value).toBe(seeded.value);
    expect([restored.selectionStart, restored.selectionEnd]).toEqual([2, 7]);

    const regionFiltered = controller.setRegionFilter(['US', 'CA']);
    expect(regionFiltered.value).toBe(seeded.value);
    expect([regionFiltered.selectionStart, regionFiltered.selectionEnd]).toEqual([2, 7]);

    const typeFiltered = controller.setNumberTypeFilter(['MOBILE']);
    expect(typeFiltered.value).toBe(seeded.value);
    expect([typeFiltered.selectionStart, typeFiltered.selectionEnd]).toEqual([2, 7]);
  });

  it('keeps every digit and the selection after undo restores a range (national)', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    const seeded = controller.setValue('2015550123');

    controller.deleteBackward(seeded.value, 1, 6);
    const restored = controller.undo();
    expect(restored.value).toBe(seeded.value);
    expect([restored.selectionStart, restored.selectionEnd]).toEqual([1, 6]);

    const typeFiltered = controller.setNumberTypeFilter(['MOBILE']);
    expect(typeFiltered.value).toBe(seeded.value);
    expect([typeFiltered.selectionStart, typeFiltered.selectionEnd]).toEqual([1, 6]);

    const regionFiltered = controller.setRegionFilter(['US']);
    expect(regionFiltered.value).toBe(seeded.value);
  });

  it('moves to the rendered caret when the excluding filter changes the rendered value', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'UA',
      display: { callingCodeInInput: false },
    });
    const seeded = controller.setValue('501234567');

    controller.deleteBackward(seeded.value, 0, 4);
    const restored = controller.undo();
    expect(restored.value).toBe(seeded.value);

    // The excluding filter drops formatting, and every digit survives with a collapsed caret.
    const filtered = controller.setRegionFilter(['US']);
    expect(filtered.value.replace(/\D/g, '')).toBe('501234567');
    expect(filtered.selectionStart).toBe(filtered.selectionEnd);

    const cleared = controller.setRegionFilter(null);
    expect(cleared.value).toBe(seeded.value);
  });
});
