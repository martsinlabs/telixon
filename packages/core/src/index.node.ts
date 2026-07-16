import { decodeLayerNativeAsync } from './resource-loader/decode-layer-native';
import { LazyResourceLoader } from './resource-loader/lazy-resource-loader';
import { getResourceProvider } from './resource-provider';

export * from './index';

// Node async init: dynamic-imports the engine modules and decodes them off the libuv threadpool (native zlib). For synchronous init, use @telixon/core/sync-init.
const loader = new LazyResourceLoader(decodeLayerNativeAsync);

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
