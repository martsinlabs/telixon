// @vitest-environment happy-dom

import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import type { PhoneInput, PhoneInputState } from '../models';
import { createPhoneInput } from '../phone-input';

const GB_MOBILE = getExampleNumber('GB', 'MOBILE');
const GB_PASTE = '+44 ' + GB_MOBILE;

function attachInput(): { input: HTMLInputElement; cleanup: () => void } {
  const input = document.createElement('input');
  document.body.appendChild(input);
  return { input, cleanup: () => input.remove() };
}

function paste(input: HTMLInputElement, text: string, selectionStart?: number, selectionEnd?: number): void {
  input.setSelectionRange(selectionStart ?? input.value.length, selectionEnd ?? input.value.length);
  input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertFromPaste', data: text, cancelable: true }));
}

describe('PhoneInput pasted international numbers', () => {
  it('moves a field with the calling code outside to the number and reports it', () => {
    const { input, cleanup } = attachInput();
    const states: string[] = [];
    const phone: PhoneInput = createPhoneInput({
      input,
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    phone.subscribe((state: PhoneInputState) => states.push(`${state.region}:${state.value}`));

    paste(input, GB_PASTE);

    expect(input.value).toBe('7400 123456');
    expect(input.selectionStart).toBe(input.value.length);
    expect(phone.getState().region).toBe('GB');
    expect(phone.getPhoneNumber().formatE164()).toBe('+44' + GB_MOBILE);
    expect(states).toEqual(['GB:7400 123456']);

    phone.destroy();
    cleanup();
  });

  it('replaces a typed number selected in full', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({
      input,
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    phone.setValue('2015550123');

    paste(input, GB_PASTE, 0, input.value.length);

    expect(input.value).toBe('7400 123456');
    expect(phone.getState().region).toBe('GB');

    phone.destroy();
    cleanup();
  });

  it('replaces the seeded calling code of a field that shows it', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({ input, mode: 'international', defaultRegion: 'US' });
    expect(input.value).toBe('1 ');

    paste(input, GB_PASTE);

    expect(input.value).toBe('44 7400 123456');
    expect(phone.getState().region).toBe('GB');

    phone.destroy();
    cleanup();
  });

  it('enters a national field of its own region in the national format', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({ input, mode: 'national', defaultRegion: 'GB' });

    paste(input, GB_PASTE);

    expect(input.value).toBe('07400 123456');
    expect(phone.getPhoneNumber().formatE164()).toBe('+44' + GB_MOBILE);

    phone.destroy();
    cleanup();
  });

  it('adopts a value that arrives with a bare input event', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({
      input,
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });

    input.value = GB_PASTE;
    input.dispatchEvent(new InputEvent('input', { inputType: 'insertFromPaste' }));

    expect(input.value).toBe('7400 123456');
    expect(phone.getState().region).toBe('GB');

    phone.destroy();
    cleanup();
  });

  it('undo after a paste restores the value and the region', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({
      input,
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    phone.setValue('2015550123');

    paste(input, GB_PASTE, 0, input.value.length);
    input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'historyUndo', cancelable: true }));

    expect(input.value).toBe('201-555-0123');
    expect(phone.getState().region).toBe('US');

    phone.destroy();
    cleanup();
  });

  it('keeps typing after a paste at the caret', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({
      input,
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });

    paste(input, '+44 7400 12');
    input.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: '3', cancelable: true }));

    expect(input.value).toBe('7400 123');
    expect(phone.getState().region).toBe('GB');

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput values written into the element from outside', () => {
  const fill = (input: HTMLInputElement, text: string): void => {
    input.value = text;
    input.dispatchEvent(new InputEvent('input', { inputType: 'insertReplacementText' }));
  };

  it('takes a national number a browser fills into a field with the calling code outside', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({
      input,
      mode: 'international',
      defaultRegion: 'GB',
      display: { callingCodeInInput: false },
    });

    fill(input, '02071838750');

    expect(input.value).toBe('20 7183 8750');
    expect(phone.getPhoneNumber().formatE164()).toBe('+442071838750');

    phone.destroy();
    cleanup();
  });

  it('takes a national number a browser fills into a field with the calling code inside', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({ input, mode: 'international', defaultRegion: 'US' });

    fill(input, '2015550123');

    expect(input.value).toBe('1 201-555-0123');
    expect(phone.getPhoneNumber().formatE164()).toBe('+12015550123');

    phone.destroy();
    cleanup();
  });

  it('takes the whole number a browser fills without a plus', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({
      input,
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });

    fill(input, '12015550123');

    expect(input.value).toBe('201-555-0123');
    expect(phone.getPhoneNumber().formatE164()).toBe('+12015550123');

    phone.destroy();
    cleanup();
  });

  it('reads a partial value as the digits it holds', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({
      input,
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });

    fill(input, '415');

    expect(input.value).toBe('415-');
    expect(phone.getPhoneNumber().isValid()).toBe(false);

    phone.destroy();
    cleanup();
  });

  it('keeps a number of another region a browser fills', () => {
    const { input, cleanup } = attachInput();
    const phone: PhoneInput = createPhoneInput({
      input,
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });

    fill(input, '+442071838750');

    expect(phone.getState().region).toBe('GB');
    expect(phone.getPhoneNumber().formatE164()).toBe('+442071838750');

    phone.destroy();
    cleanup();
  });
});
