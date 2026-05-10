import { getResourceProvider } from './resource-provider';

export { getResourceProvider } from './resource-provider';

export function ensureReady(): Promise<void> {
  return getResourceProvider().ensureReady();
}
