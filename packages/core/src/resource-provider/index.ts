import { getResourceProvider } from './resource-provider';

export { getResourceProvider } from './resource-provider';

/** Whether the engine is loaded. Branch on it to avoid an {@link EngineNotReadyError}. */
export function isEngineReady(): boolean {
  return getResourceProvider().isReady;
}
