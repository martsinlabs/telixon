import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineLayerBytes } from '../../engine';
import { EmbeddedResourceLoader } from '../../resource-loader/embedded-resource-loader';
import type { ResourceLoader } from '../../resource-loader/models';
import type { ResourceProvider } from '../models';

// Each test gets a fresh provider: reset the process-wide singleton, then drive it with the test's loader.
async function createIsolatedProvider(): Promise<ResourceProvider> {
  vi.resetModules();
  const providerModule = await import('../resource-provider');
  providerModule.__resetResourceProvider();
  return providerModule.getResourceProvider();
}

// Async-only loader: simulates the browser channel (no sync bytes), with leading failures to exercise retry.
function createAsyncOnlyLoader(failuresBeforeSuccess: number): ResourceLoader {
  const embedded = new EmbeddedResourceLoader();
  let failuresLeft: number = failuresBeforeSuccess;
  return {
    async loadEngineBytes(): Promise<EngineLayerBytes> {
      if (failuresLeft > 0) {
        failuresLeft--;
        throw new Error('simulated chunk failure');
      }
      return embedded.loadEngineBytesSync();
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
        return embedded.loadEngineBytesSync();
      },
    };
    const provider = await createIsolatedProvider();

    await Promise.all([
      provider.ensureReady(countingLoader),
      provider.ensureReady(countingLoader),
      provider.ensureReady(countingLoader),
    ]);
    expect(provider.isReady).toBe(true);
    expect(loadCalls).toBe(1);
  });

  it('a failed load clears in-flight state and the next ensureReady retries successfully', async () => {
    const loader = createAsyncOnlyLoader(1);
    const provider = await createIsolatedProvider();

    await expect(provider.ensureReady(loader)).rejects.toThrow('simulated chunk failure');
    expect(provider.isReady).toBe(false);

    await provider.ensureReady(loader);
    expect(provider.isReady).toBe(true);
  });

  it('ensureReadySync initializes synchronously on a local byte channel', async () => {
    const provider = await createIsolatedProvider();

    expect(provider.isReady).toBe(false);
    provider.ensureReadySync(new EmbeddedResourceLoader());
    expect(provider.isReady).toBe(true);
  });

  it('ensureReadySync during an in-flight async load wins and the load result is discarded', async () => {
    const provider = await createIsolatedProvider();

    const inFlight: Promise<void> = provider.ensureReady(createAsyncOnlyLoader(0));
    provider.ensureReadySync(new EmbeddedResourceLoader());
    expect(provider.isReady).toBe(true);

    await expect(inFlight).resolves.toBeUndefined();
    expect(provider.isReady).toBe(true);
  });
});
