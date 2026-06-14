import { EmbeddedResourceLoader } from '@telixon/core/resource-loader/embedded-resource-loader';
import { setResourceLoader } from '@telixon/core/resource-loader/resource-loader.config';
import { getResourceProvider } from '@telixon/core/resource-provider';

setResourceLoader(new EmbeddedResourceLoader());
await getResourceProvider().ensureReady();
