import { DYNAMIC_ENGINE_MODULES } from '../dynamic-engine-modules';
import { ENGINE_MODULES, EngineLayerBytes } from '../engine';
import { retryAsync } from '../utils/retry-async';
import { ResourceLoader } from './models';

// A transient failure importing a chunk should not kill the load: retry a few times (a browser-cached failed fetch can't recover; it surfaces through ensureEngineReady).
const IMPORT_ATTEMPTS = 3;
const IMPORT_RETRY_BASE_DELAY_MS = 200;

// Async, on-demand loader: dynamic-imports each engine module (host-bundler code-split chunks on the web, local modules on Node and edge); decode is injected (native off-thread zlib on Node, DecompressionStream on the web and edge). On-demand loading cannot be synchronous, so this loader has no sync channel.
export class LazyResourceLoader implements ResourceLoader {
  constructor(private readonly decodeLayer: (base64: string) => Promise<ArrayBuffer>) {}

  async loadEngineBytes(): Promise<EngineLayerBytes> {
    const bytes: Record<string, ArrayBuffer> = {};

    await Promise.all(
      ENGINE_MODULES.map(async ({ file }) => {
        const importer = DYNAMIC_ENGINE_MODULES[file];
        if (!importer) throw new Error(`No engine module for ${file}`);
        const payload = (await retryAsync(importer, IMPORT_ATTEMPTS, IMPORT_RETRY_BASE_DELAY_MS)).default;

        await Promise.all(
          Object.keys(payload).map(async (layerKey) => {
            bytes[layerKey] = await this.decodeLayer(payload[layerKey]!);
          }),
        );
      }),
    );

    return bytes as unknown as EngineLayerBytes;
  }
}
