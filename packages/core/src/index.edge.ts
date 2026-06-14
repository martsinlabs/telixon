// Edge entry (workerd, edge-light, worker conditions): modules ship in the deployed script, so the engine initializes synchronously in global scope, outside per-request CPU accounting.
import { EmbeddedResourceLoader } from './resource-loader/embedded-resource-loader';
import { setResourceLoader } from './resource-loader/resource-loader.config';
import { ensureEngineReadySync } from './resource-provider';

setResourceLoader(new EmbeddedResourceLoader());
ensureEngineReadySync();

export * from './index';
