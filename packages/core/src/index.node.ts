import { decodeLayerNativeAsync } from './resource-loader/decode-layer-native';
import { LazyResourceLoader } from './resource-loader/lazy-resource-loader';
import { getResourceProvider } from './resource-provider';

export * from './index';

// Node async init: dynamic-imports the engine modules and decodes them off the libuv threadpool (native zlib). For synchronous init, use @telixon/core/sync-init.
const loader = new LazyResourceLoader(decodeLayerNativeAsync);

export function ensureEngineReady(): Promise<void> {
  return getResourceProvider().ensureReady(loader);
}
