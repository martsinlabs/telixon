import { TelixonNotReadyError } from '../errors';
import { getResourceProvider } from '../resource-provider';
import { ResourceProvider } from '../resource-provider/models';

export function assertResourcesReady(): void {
  const provider: ResourceProvider = getResourceProvider();

  if (!provider.isReady) {
    throw new TelixonNotReadyError();
  }
}
