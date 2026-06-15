import { getResourceProvider } from './resource-provider';

export { getResourceProvider } from './resource-provider';

// Synchronous readiness predicate for guards in code that may run before the engine is initialized.
export function isEngineReady(): boolean {
  return getResourceProvider().isReady;
}
