// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { createPhoneInput } from '../phone-input';

function attachInput(): { input: HTMLInputElement; cleanup: () => void } {
  const input = document.createElement('input');
  input.type = 'tel';
  document.body.appendChild(input);
  return { input, cleanup: () => input.remove() };
}

describe('PhoneInput validationError', () => {
  it('is null for a fully valid number', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });
    phone.setValue('2125551234');
    expect(phone.getState().validationError).toBeNull();

    phone.destroy();
    cleanup();
  });

  it('reports TOO_SHORT while the user is still typing', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });
    phone.setValue('212');
    expect(phone.getState().validationError?.kind).toBe('TOO_SHORT');

    phone.destroy();
    cleanup();
  });

  it('reports NATIONAL_PREFIX_MISSING for AE without the prefix typed', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({ input, mode: 'national', country: 'AE' });
    phone.setValue('501234567');
    expect(phone.getState().validationError).toEqual({
      kind: 'NATIONAL_PREFIX_MISSING',
      expectedPrefix: '0',
    });

    phone.destroy();
    cleanup();
  });

  it('clears once the national prefix is typed for AE', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({ input, mode: 'national', country: 'AE' });
    phone.setValue('0501234567');
    expect(phone.getState().validationError).toBeNull();

    phone.destroy();
    cleanup();
  });

  it('delivers updated validationError to subscribers on state change', () => {
    const { input, cleanup } = attachInput();

    const phone = createPhoneInput({ input, mode: 'national', country: 'AE' });
    const seen: Array<unknown> = [];
    phone.subscribe((state) => seen.push(state.validationError?.kind ?? null));

    phone.setValue('501234567');
    phone.setValue('0501234567');

    expect(seen).toContain('NATIONAL_PREFIX_MISSING');
    expect(seen[seen.length - 1]).toBeNull();

    phone.destroy();
    cleanup();
  });
});
