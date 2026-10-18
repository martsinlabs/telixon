// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import type { PhoneInput } from '../models';
import { createPhoneInput } from '../phone-input';

function attachInput(): HTMLInputElement {
  const input: HTMLInputElement = document.createElement('input');
  document.body.appendChild(input);
  return input;
}

function insertText(input: HTMLInputElement, data: string): InputEvent {
  const event: InputEvent = new InputEvent('beforeinput', {
    inputType: 'insertText',
    data,
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(event);
  return event;
}

describe('PhoneInput on an input the user cannot edit', () => {
  it('leaves a read-only input alone', () => {
    const input: HTMLInputElement = attachInput();
    const phone: PhoneInput = createPhoneInput({ input, mode: 'national', defaultRegion: 'US' });
    input.readOnly = true;

    const event: InputEvent = insertText(input, '4');
    expect(event.defaultPrevented).toBe(false);
    expect(input.value).toBe('');
    expect(phone.getState().value).toBe('');

    input.readOnly = false;
    insertText(input, '4');
    expect(phone.getState().value).toContain('4');
    phone.destroy();
    input.remove();
  });

  it('leaves a disabled input alone', () => {
    const input: HTMLInputElement = attachInput();
    const phone: PhoneInput = createPhoneInput({ input, mode: 'national', defaultRegion: 'US' });
    input.disabled = true;

    insertText(input, '4');
    expect(phone.getState().value).toBe('');
    phone.destroy();
    input.remove();
  });
});

describe('PhoneInput on a read-only input and the keyboard', () => {
  it('ignores undo and redo keys', () => {
    const input: HTMLInputElement = attachInput();
    const phone: PhoneInput = createPhoneInput({ input, mode: 'national', defaultRegion: 'US' });
    insertText(input, '4');
    insertText(input, '1');
    const before: string = phone.getState().value;
    input.readOnly = true;

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
    expect(phone.getState().value).toBe(before);
    expect(input.value).toBe(before);
    phone.destroy();
    input.remove();
  });
});
