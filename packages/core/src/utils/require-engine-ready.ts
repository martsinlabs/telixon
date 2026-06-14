import { getResourceProvider } from '../resource-provider';
import { ResourceProvider } from '../resource-provider/models';

// API entry gate: initialize synchronously if the byte channel is local; on the network channel (bytes in flight) this throws TelixonNotReadyError.
export function requireEngineReady(): void {
  const provider: ResourceProvider = getResourceProvider();

  if (!provider.isReady) {
    provider.ensureReadySync();
  }
}
