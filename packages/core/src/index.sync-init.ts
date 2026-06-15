import { EmbeddedResourceLoader } from './resource-loader/embedded-resource-loader';
import { getResourceProvider } from './resource-provider';

// Sync init extension: bundles the engine modules (static import) and decodes them synchronously (pure-JS), readying the shared engine without awaiting. This entry exports only the synchronous initializer.
const loader = new EmbeddedResourceLoader();

export function ensureEngineReadySync(): void {
  getResourceProvider().ensureReadySync(loader);
}
