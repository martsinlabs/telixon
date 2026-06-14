import { ensureEngineReady } from '@telixon/core';

export async function bootstrapResources(onError?: (message: string) => void): Promise<boolean> {
  try {
    await ensureEngineReady();
    return true;
  } catch (err) {
    const message: string = err instanceof Error ? err.message : 'Unknown error';
    onError?.(message);
    return false;
  }
}
