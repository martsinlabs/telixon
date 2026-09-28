// @vitest-environment happy-dom

import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import type { PhoneInput } from '../models';
import { createPhoneInput } from '../phone-input';

const US_MOBILE = getExampleNumber('US', 'MOBILE');

function attachInput(): { input: HTMLInputElement; cleanup: () => void } {
  const input = document.createElement('input');
  document.body.appendChild(input);
  return { input, cleanup: () => input.remove() };
}

function beforeInput(input: HTMLInputElement, inputType: string, data: string | null = null): InputEvent {
  const event = new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true });
  input.dispatchEvent(event);
  return event;
}

describe('PhoneInput owns every edit of its value', () => {
  // A single-line input turns these into form submission, which the widget must not cancel.
  it.each(['insertLineBreak', 'insertParagraph'])('lets %s through', (inputType) => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({ input, mode: 'national', defaultRegion: 'US' });
    phone.setValue(US_MOBILE);
    const before: string = input.value;

    const event = beforeInput(input, inputType);

    expect(event.defaultPrevented).toBe(false);
    expect(input.value).toBe(before);

    phone.destroy();
    cleanup();
  });

  it.each([
    'insertTranspose',
    'insertLink',
    'insertFromComposition',
    'formatBold',
    'deleteByComposition',
    'insertSomethingNobodyShipsYet',
  ])('cancels %s, which it cannot perform itself', (inputType) => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({ input, mode: 'national', defaultRegion: 'US' });
    phone.setValue(US_MOBILE);
    const before: string = input.value;

    const event = beforeInput(input, inputType, 'x');

    expect(event.defaultPrevented).toBe(true);
    expect(input.value).toBe(before);

    phone.destroy();
    cleanup();
  });

  it('cancels the edits it performs', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({ input, mode: 'national', defaultRegion: 'US' });

    expect(beforeInput(input, 'insertText', '2').defaultPrevented).toBe(true);
    expect(beforeInput(input, 'deleteContentBackward').defaultPrevented).toBe(true);
    expect(beforeInput(input, 'historyUndo').defaultPrevented).toBe(true);

    phone.destroy();
    cleanup();
  });

  it('cancels an undo it has no history for', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({ input, mode: 'national', defaultRegion: 'US' });

    expect(beforeInput(input, 'historyUndo').defaultPrevented).toBe(true);
    expect(beforeInput(input, 'historyRedo').defaultPrevented).toBe(true);

    phone.destroy();
    cleanup();
  });

  it('leaves an insert it cannot read to the browser and reads the result back', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({ input, mode: 'national', defaultRegion: 'US' });

    // A browser that puts the pasted text nowhere the event exposes still performs the paste.
    const event = beforeInput(input, 'insertFromPaste', null);
    expect(event.defaultPrevented).toBe(false);

    input.value = US_MOBILE;
    input.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste' }));

    expect(input.value).toBe('(201) 555-0123');
    expect(phone.getPhoneNumber().formatE164()).toBe('+12015550123');

    phone.destroy();
    cleanup();
  });

  it('reads back any text that reaches the element without the widget', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({ input, mode: 'national', defaultRegion: 'US' });

    input.value = 'abc 415 def 555 ghi 0132';
    input.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));

    expect(input.value).toBe('(415) 555-0132');
    expect(phone.getPhoneNumber().formatE164()).toBe('+14155550132');

    phone.destroy();
    cleanup();
  });
});
