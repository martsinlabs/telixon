import { getResourceProvider } from "../resource-provider";
import { ResourceProvider } from "../resource-provider/models";

export function assertResourcesReady(): void {
  const provider: ResourceProvider = getResourceProvider();

  if (!provider.isReady) {
    throw new Error(
      "[Telixon] Resources are not loaded. Call loadResources() before using the library."
    );
  }
}
