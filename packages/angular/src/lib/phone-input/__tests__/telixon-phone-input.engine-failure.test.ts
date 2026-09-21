import { Component, ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ensureEngineReady } from '@telixon/core';
import { afterEach, expect, it, vi } from 'vitest';
import { TelixonPhoneInput } from '../telixon-phone-input';

vi.mock('@telixon/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@telixon/core')>()),
  ensureEngineReady: vi.fn((): Promise<void> => Promise.resolve()),
}));

@Component({
  imports: [TelixonPhoneInput],
  template: `<input telixonPhoneInput />`,
})
class Host {}

afterEach(() => {
  TestBed.resetTestingModule();
});

it('reports a failed engine load to ErrorHandler and leaves the input plain', async () => {
  const failure = new Error('offline');
  vi.mocked(ensureEngineReady).mockRejectedValueOnce(failure);
  const handleError = vi.fn();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), { provide: ErrorHandler, useValue: { handleError } }],
  });

  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(handleError).toHaveBeenCalledWith(failure);
  expect(fixture.debugElement.children[0]?.injector.get(TelixonPhoneInput).phone()).toBe(null);
});
