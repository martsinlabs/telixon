import { decodeLayerStream } from './resource-loader/decode-layer-stream';
import { LazyResourceLoader } from './resource-loader/lazy-resource-loader';
import { getResourceProvider } from './resource-provider';

export * from './index';

// Edge async init (workerd, edge-light, worker): dynamic import + off-thread DecompressionStream, run inside a request. For global-scope, once-per-isolate init, use @telixon/core/sync-init.
const loader = new LazyResourceLoader(decodeLayerStream);

export function ensureEngineReady(): Promise<void> {
  return getResourceProvider().ensureReady(loader);
}
