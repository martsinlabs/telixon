import { ensureReady } from '@telixon/core';

export async function bootstrapResources(onError?: (message: string) => void): Promise<boolean> {
  try {
    await ensureReady();
    return true;
  } catch (err) {
    const message: string = err instanceof Error ? err.message : 'Unknown error';
    onError?.(message);
    return false;
  }
}
