import { setResourceLoader } from './resource-loader/resource-loader.config';
import { WebResourceLoader } from './resource-loader/web-resource-loader';

// Browser entry: register the network loader only. When to load is the consumer's call (ensureEngineReady), never an import side effect.
setResourceLoader(new WebResourceLoader());

export * from './index';
