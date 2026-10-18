import { describe, expect, it } from 'vitest';

// The entry a server bundle resolves, where no DOM exists at import time.
describe('the server entry', () => {
  it('imports without a DOM and refuses to define the elements', async () => {
    expect(typeof globalThis.HTMLElement).toBe('undefined');
    const entry = await import('../index.server');
    expect(entry.PHONE_FIELD_TAG).toBe('telixon-phone-field');
    expect(typeof entry.parsePhoneNumber).toBe('function');
    expect(() => entry.defineTelixonElements()).toThrow(/on the client/);
    expect(() => new entry.TelixonPhoneFieldElement()).toThrow(/on the client/);
  });
});
