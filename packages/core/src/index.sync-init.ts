import { EmbeddedResourceLoader } from './resource-loader/embedded-resource-loader';
import { getResourceProvider } from './resource-provider';

// Sync init extension: bundles the engine modules (static import) and decodes them synchronously (pure-JS), readying the shared engine without awaiting. This entry exports only the synchronous initializer.
const loader = new EmbeddedResourceLoader();

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
