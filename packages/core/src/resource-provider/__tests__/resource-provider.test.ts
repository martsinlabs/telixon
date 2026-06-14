import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineLayerBytes } from '../../engine';
import { EmbeddedResourceLoader } from '../../resource-loader/embedded-resource-loader';
import type { ResourceLoader } from '../../resource-loader/models';
import type { ResourceProvider } from '../models';

// Each test gets a fresh module registry, so the provider singleton and loader start clean.
async function createIsolatedProvider(loader: ResourceLoader): Promise<ResourceProvider> {
  vi.resetModules();
  const loaderConfig = await import('../../resource-loader/resource-loader.config');
  loaderConfig.setResourceLoader(loader);
  const providerModule = await import('../resource-provider');
  return providerModule.getResourceProvider();
}

// Async-only view of the bundled loader: simulates the browser channel (no loadModulesSync), with leading failures to exercise retry/self-healing.
function createAsyncOnlyLoader(failuresBeforeSuccess: number): ResourceLoader {
  const embedded = new EmbeddedResourceLoader();
  let failuresLeft: number = failuresBeforeSuccess;
  return {
    async loadEngineBytes(): Promise<EngineLayerBytes> {
      if (failuresLeft > 0) {
        failuresLeft--;
        throw new Error('simulated chunk failure');
      }
      return embedded.loadEngineBytes();
    },
  };
}

describe('DefaultResourceProvider state machine', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('ensureReady is idempotent: concurrent calls share one load', async () => {
    let loadCalls = 0;
    const embedded = new EmbeddedResourceLoader();
    const countingLoader: ResourceLoader = {
      async loadEngineBytes(): Promise<EngineLayerBytes> {
        loadCalls++;
        return embedded.loadEngineBytes();
      },
    };
    const provider = await createIsolatedProvider(countingLoader);

    await Promise.all([provider.ensureReady(), provider.ensureReady(), provider.ensureReady()]);
    expect(provider.isReady).toBe(true);
    expect(loadCalls).toBe(1);
  });

  it('a failed load clears in-flight state and the next ensureReady retries successfully', async () => {
    const provider = await createIsolatedProvider(createAsyncOnlyLoader(1));

    await expect(provider.ensureReady()).rejects.toThrow('simulated chunk failure');
    expect(provider.isReady).toBe(false);

    await provider.ensureReady();
    expect(provider.isReady).toBe(true);
  });

  it('ensureReadySync on an async-only channel throws TelixonNotReadyError and restarts a failed load', async () => {
    const provider = await createIsolatedProvider(createAsyncOnlyLoader(1));

    await expect(provider.ensureReady()).rejects.toThrow('simulated chunk failure');

    // The throw itself must kick a fresh background load (self-healing).
    expect(() => provider.ensureReadySync()).toThrow('still loading');
    await provider.ensureReady();
    expect(provider.isReady).toBe(true);
  });

  it('ensureReadySync initializes synchronously on a local byte channel', async () => {
    const provider = await createIsolatedProvider(new EmbeddedResourceLoader());

    expect(provider.isReady).toBe(false);
    provider.ensureReadySync();
    expect(provider.isReady).toBe(true);
  });

  it('ensureReadySync during an in-flight async load wins and the load result is discarded', async () => {
    const provider = await createIsolatedProvider(new EmbeddedResourceLoader());

    const inFlight: Promise<void> = provider.ensureReady();
    provider.ensureReadySync();
    expect(provider.isReady).toBe(true);

    await expect(inFlight).resolves.toBeUndefined();
    expect(provider.isReady).toBe(true);
  });
});
