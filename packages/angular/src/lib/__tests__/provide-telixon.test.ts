// @vitest-environment jsdom
import '@angular/compiler';
import {
  ErrorHandler,
  PLATFORM_ID,
  provideZonelessChangeDetection,
  type EnvironmentProviders,
  type Provider,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { ensureEngineReady } from '@telixon/core';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { provideTelixon } from '../provide-telixon';

vi.mock('@telixon/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@telixon/core')>()),
  ensureEngineReady: vi.fn((): Promise<void> => Promise.resolve()),
}));

const load = vi.mocked(ensureEngineReady);

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
});

beforeEach(() => {
  load.mockClear();
});

afterEach(() => {
  TestBed.resetTestingModule();
});

function bootstrap(providers: Array<Provider | EnvironmentProviders>, platform: string = 'browser'): void {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: platform }, ...providers],
  });
  // The first injection runs the environment initializers.
  TestBed.inject(PLATFORM_ID);
}

describe('provideTelixon', () => {
  it('starts the engine load after the first render with preloadEngine', () => {
    bootstrap([provideTelixon({ preloadEngine: true })]);
    expect(load).not.toHaveBeenCalled();

    TestBed.tick();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('leaves the engine alone on the server', () => {
    bootstrap([provideTelixon({ preloadEngine: true })], 'server');

    TestBed.tick();

    expect(load).not.toHaveBeenCalled();
  });

  it('reports a failed engine preload to ErrorHandler', async () => {
    const failure = new Error('offline');
    load.mockRejectedValueOnce(failure);
    const handleError = vi.fn();
    bootstrap([provideTelixon({ preloadEngine: true }), { provide: ErrorHandler, useValue: { handleError } }]);

    TestBed.tick();
    // The rejection settles on the first hop and the catch handler runs on the second.
    await Promise.resolve();
    await Promise.resolve();

    expect(handleError).toHaveBeenCalledWith(failure);
  });

  it('loads nothing without preloadEngine', () => {
    bootstrap([provideTelixon()]);

    TestBed.tick();

    expect(load).not.toHaveBeenCalled();
  });

  it('loads nothing without the provider', () => {
    bootstrap([]);

    TestBed.tick();

    expect(load).not.toHaveBeenCalled();
  });
});
