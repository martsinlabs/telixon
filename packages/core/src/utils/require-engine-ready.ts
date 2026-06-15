import { TelixonNotReadyError } from '../errors';
import { getResourceProvider } from '../resource-provider';

// API entry gate: the engine must be initialized first via ensureEngineReady() or ensureEngineReadySync(); a call before then throws.
export function requireEngineReady(): void {
  if (!getResourceProvider().isReady) {
    throw new TelixonNotReadyError();
  }
}
