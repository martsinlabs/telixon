import { decodeLayerStream } from './resource-loader/decode-layer-stream';
import { LazyResourceLoader } from './resource-loader/lazy-resource-loader';
import { getResourceProvider } from './resource-provider';

export * from './index';

// Browser async init: fetches the code-split engine modules and decodes them off-thread (DecompressionStream). When to load is the consumer's call, never an import side effect.
const loader = new LazyResourceLoader(decodeLayerStream);

export function ensureEngineReady(): Promise<void> {
  return getResourceProvider().ensureReady(loader);
}
