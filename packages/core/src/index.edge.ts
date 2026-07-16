import { decodeLayerStream } from './resource-loader/decode-layer-stream';
import { LazyResourceLoader } from './resource-loader/lazy-resource-loader';
import { getResourceProvider } from './resource-provider';

export * from './index';

// Edge async init (workerd, edge-light, worker): dynamic import + off-thread DecompressionStream, run inside a request. For global-scope, once-per-isolate init, use @telixon/core/sync-init.
const loader = new LazyResourceLoader(decodeLayerStream);

/**
 * Loads the engine. Call it once before the first API call: it is idempotent. Nothing loads at
 * import time. API calls made before it resolves throw {@link EngineNotReadyError}.
 *
 * @example
 * await ensureEngineReady();
 * parsePhoneNumber('+1 (415) 555-0132').isValid(); // true
 */
export function ensureEngineReady(): Promise<void> {
  return getResourceProvider().ensureReady(loader);
}
