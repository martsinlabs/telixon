import { NodeResourceLoader } from '@telixon/core/resource-loader/node-resource-loader';
import { setResourceLoader } from '@telixon/core/resource-loader/resource-loader.config';
import { getResourceProvider } from '@telixon/core/resource-provider';

setResourceLoader(new NodeResourceLoader());
await getResourceProvider().ensureReady();
