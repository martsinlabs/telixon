import { EmbeddedResourceLoader } from '@telixon/core/resource-loader/embedded-resource-loader';
import { getResourceProvider } from '@telixon/core/resource-provider';

getResourceProvider().ensureReadySync(new EmbeddedResourceLoader());
