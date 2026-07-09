// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { createPhoneInput } from '../phone-input';

function attachInput(): { input: HTMLInputElement; cleanup: () => void } {
  const input = document.createElement('input');
  input.type = 'tel';
  document.body.appendChild(input);
  return { input, cleanup: () => input.remove() };
}

describe('PhoneInput placeholder', () => {
  it('national mode uses prefix-free variant when the format flag is optional', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({ input, mode: 'national', defaultRegion: 'US' });
    expect(phone.getState().placeholder).toBe('(201) 555-0123');

    phone.destroy();
    cleanup();
  });

  it('national mode uses with-prefix variant for prefix-required regions', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({ input, mode: 'national', defaultRegion: 'AE' });
    expect(phone.getState().placeholder).toBe('050 123 4567');

    phone.destroy();
    cleanup();
  });

  it('international plus mode prefixes "+CC " to the international body', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({
      input,
      mode: 'international',
      display: { callingCodeInInput: true, plusPrefix: 'fixed' },
      defaultRegion: 'US',
    });
    expect(phone.getState().placeholder).toBe('+1 201-555-0123');

    phone.destroy();
    cleanup();
  });

  it('international no-plus mode prefixes "CC " to the international body', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({
      input,
      mode: 'international',
      display: { callingCodeInInput: true, plusPrefix: 'none' },
      defaultRegion: 'US',
    });
    expect(phone.getState().placeholder).toBe('1 201-555-0123');

    phone.destroy();
    cleanup();
  });

  it('international split mode uses the international body directly', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({
      input,
      mode: 'international',
      display: { callingCodeInInput: false },
      defaultRegion: 'US',
    });
    expect(phone.getState().placeholder).toBe('201-555-0123');

    phone.destroy();
    cleanup();
  });

  it('international embedded without defaultRegion produces null until a region resolves', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({
      input,
      mode: 'international',
      display: { callingCodeInInput: true, plusPrefix: 'fixed' },
    });
    expect(phone.getState().placeholder).toBeNull();

    phone.destroy();
    cleanup();
  });

  it('placeholderNumberType option overrides the default MOBILE type', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({
      input,
      mode: 'national',
      defaultRegion: 'US',
      placeholderNumberType: 'TOLL_FREE',
    });
    expect(phone.getState().placeholder).toBe('(800) 234-5678');

    phone.destroy();
    cleanup();
  });

  it('updates on setRegion', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({ input, mode: 'national', defaultRegion: 'US' });
    expect(phone.getState().placeholder).toBe('(201) 555-0123');

    phone.setRegion('GB');
    expect(phone.getState().placeholder).not.toBe('(201) 555-0123');
    expect(phone.getState().placeholder).not.toBeNull();

    phone.destroy();
    cleanup();
  });
});
