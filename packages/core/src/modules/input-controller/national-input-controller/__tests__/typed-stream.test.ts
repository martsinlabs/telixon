import { describe, expect, it } from 'vitest';
import { createNationalInputController } from '..';
import { InputState } from '../../models';

// The typed digits are the source of truth; the rendered value never re-enters the parser.
// AR masks write literal digits into the rendering and BY hides a typed trunk zero, so these
// regions pin the projection semantics for every re-resolving operation.

describe('NationalInputController typed digit stream', () => {
  it('keeps the rendering stable across no-op filter calls (AR mask literals)', () => {
    const controller = createNationalInputController({ defaultRegion: 'AR' });
    const seeded = controller.setValue('999123456');

    expect(controller.setNumberTypeFilter(null).value).toBe(seeded.value);
    expect(controller.setNumberTypeFilter(null).value).toBe(seeded.value);
    expect(controller.setRegionFilter(null).value).toBe(seeded.value);
  });

  it('resolves keystroke typing and pasting of the same digits to the same state', () => {
    const typedController = createNationalInputController({ defaultRegion: 'AR' });
    let state: InputState = typedController.currentState;
    for (const digit of '91123456789') {
      state = typedController.insert(state.value, digit, state.selectionStart, state.selectionEnd);
    }

    const pastedController = createNationalInputController({ defaultRegion: 'AR' });
    const pasted = pastedController.setValue('91123456789');

    expect(state.value).toBe(pasted.value);
    expect(typedController.getPhoneNumber().formatE164()).toBe(pastedController.getPhoneNumber().formatE164());
  });

  it('extends the number without mutating the earlier digits (AR append after paste)', () => {
    const controller = createNationalInputController({ defaultRegion: 'AR' });
    const seeded = controller.setValue('999123456');

    const appended = controller.insert(seeded.value, '7', seeded.value.length, seeded.value.length);

    expect(appended.value).toBe(`${seeded.value}7`);
  });

  it('keeps a typed digit the BY rendering hides across a no-op filter call', () => {
    const controller = createNationalInputController({ defaultRegion: 'BY' });
    const seeded = controller.setValue('00234567');

    const filtered = controller.setRegionFilter(null);

    expect(filtered.value).toBe(seeded.value);
  });

  it('restores a display-hidden digit when the region switches back', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    const seeded = controller.setValue('0501234567');

    controller.setRegion('BY');
    const restored = controller.setRegion('US');

    expect(restored.value).toBe(seeded.value);
  });

  it("treats setValue of the controller's own rendered value as a fixed point", () => {
    const controller = createNationalInputController({ defaultRegion: 'BY' });
    const seeded = controller.insert('', '8002345678', 0, 0);

    expect(controller.setValue(seeded.value).value).toBe(seeded.value);
  });

  it('answers queries from the typed stream behind a lossy rendering', () => {
    const controller = createNationalInputController({ defaultRegion: 'BY' });
    controller.setValue('80294911911');

    expect(controller.getPhoneNumber().formatE164()).toBe('+375294911911');
  });

  it('empties the typed stream when a delete empties the rendering', () => {
    const controller = createNationalInputController({ defaultRegion: 'AR' });
    let state: InputState = controller.setValue('91123456789');

    let presses = 0;
    while (state.value !== '' && presses < 20) {
      state = controller.deleteBackward(state.value, state.value.length, state.value.length);
      presses++;
    }

    expect(state.value).toBe('');
    // Typing into the emptied field starts from zero digits; the hidden '9' is gone with the rest.
    const typed = controller.insert('', '5', 0, 0);
    expect(typed.value).toBe('5');
  });

  it('re-setting the shown value is a fixed point after a delete trims a mask literal (AR)', () => {
    const controller = createNationalInputController({ defaultRegion: 'AR' });
    let state: InputState = controller.currentState;
    for (const digit of '91162') {
      state = controller.insert(state.value, digit, state.value.length, state.value.length);
    }
    state = controller.deleteBackward(state.value, state.value.length, state.value.length);
    state = controller.deleteBackward(state.value, state.value.length, state.value.length);

    // The backward render dropped the trailing "15" literal; re-setting that value keeps it dropped.
    expect(controller.setValue(state.value).value).toBe(state.value);
  });
});
