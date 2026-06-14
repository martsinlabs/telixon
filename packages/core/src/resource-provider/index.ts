import { getResourceProvider } from './resource-provider';

export { getResourceProvider } from './resource-provider';

// Preload: pays the one-time decode-and-parse cost at a chosen moment instead of inside the first API call (which otherwise initializes synchronously).
export function ensureEngineReady(): Promise<void> {
  return getResourceProvider().ensureReady();
}

export function ensureEngineReadySync(): void {
  getResourceProvider().ensureReadySync();
}

// Synchronous readiness predicate for guards in code that may run before the engine loads.
export function isEngineReady(): boolean {
  return getResourceProvider().isReady;
}
