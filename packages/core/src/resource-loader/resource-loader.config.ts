import { ResourceLoader } from './models';

let currentLoader: ResourceLoader | undefined;

export function setResourceLoader(loader: ResourceLoader) {
  currentLoader = loader;
}

export function getResourceLoader(): ResourceLoader {
  if (!currentLoader) {
    throw new Error('ResourceLoader is not configured');
  }

  return currentLoader;
}
