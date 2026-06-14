// Retries a transiently failing async operation with linear backoff; the last failure is rethrown unchanged.
export async function retryAsync<T>(operation: () => Promise<T>, attempts: number, baseDelayMs: number): Promise<T> {
  if (attempts < 1) throw new RangeError('retryAsync: attempts must be at least 1');

  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    try {
      return await operation();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}
