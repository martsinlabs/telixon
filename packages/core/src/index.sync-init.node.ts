import { decodeLayerNative } from './resource-loader/decode-layer-native';
import { EmbeddedResourceLoader } from './resource-loader/embedded-resource-loader';
import { getResourceProvider } from './resource-provider';

// Sync init extension for Node: native zlib decode of the bundled engine modules. This entry exports only the synchronous initializer.
const loader = new EmbeddedResourceLoader(decodeLayerNative);

/**
 * Loads the engine synchronously from tables embedded in the bundle, for code that cannot await.
 * Prefer {@link ensureEngineReady} elsewhere; embedding costs bundle size.
 *
 * @example
 * import { ensureEngineReadySync } from '@telixon/core/sync-init';
 * ensureEngineReadySync();
 */
export function ensureEngineReadySync(): void {
  getResourceProvider().ensureReadySync(loader);
}
