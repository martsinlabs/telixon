import { describe, expect, it } from 'vitest';
import { createNationalInputController } from '../national-input-controller';

describe('national controller history de-duplication', () => {
  it('does not push when typing a non-digit leaves value and country unchanged', () => {
    const controller = createNationalInputController({ country: 'AR' });
    const initial = controller.setValue('0111523456789');

    expect(controller.canUndo).toBe(true);

    controller.insert(initial.value, 'a', initial.value.length, initial.value.length);
    controller.undo();

    expect(controller.currentState.value).toBe('');
  });

  it('does not push when setValue receives an equivalent value', () => {
    const controller = createNationalInputController({ country: 'AR' });
    controller.setValue('0111523456789');
    controller.setValue('0111523456789');
    controller.undo();

    expect(controller.currentState.value).toBe('');
  });

  it('updates caret on the current entry without growing history', () => {
    const controller = createNationalInputController({ country: 'AR' });
    const initial = controller.setValue('0111523456789');

    controller.insert(initial.value, 'a', 0, 0);

    const afterCurrent = controller.currentState;
    expect(afterCurrent.value).toBe(initial.value);
    expect(afterCurrent.selectionStart).toBe(0);

    controller.undo();
    expect(controller.currentState.value).toBe('');
  });
});
