import { describe, expect, it } from 'vitest';
import { createNationalInputController } from '..';

describe('NationalInputController bad input', () => {
  it('treats a null value or text as empty instead of throwing', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });

    expect(() => controller.setValue(null as unknown as string)).not.toThrow();
    expect(controller.currentState.value).toBe('');

    expect(() => controller.insert(null as unknown as string, null as unknown as string, 0, 0)).not.toThrow();
    expect(() => controller.deleteBackward(null as unknown as string, 1, 1)).not.toThrow();
    expect(() => controller.deleteForward(null as unknown as string, 0, 0)).not.toThrow();
  });

  it('consumes a selection overwritten by a digit-less insert', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    const seeded = controller.setValue('4155550132');

    const overwritten = controller.insert(seeded.value, '+', 0, seeded.value.length);

    expect(overwritten.value.replace(/\D/g, '')).toBe('');
  });
});
