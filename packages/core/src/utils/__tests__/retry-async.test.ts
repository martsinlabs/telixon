import { describe, expect, it } from 'vitest';
import { retryAsync } from '../retry-async';

function failingTimes(failures: number): { operation: () => Promise<string>; calls: () => number } {
  let calls = 0;
  return {
    operation: async () => {
      calls++;
      if (calls <= failures) throw new Error(`failure ${calls}`);
      return 'ok';
    },
    calls: () => calls,
  };
}

describe('retryAsync', () => {
  it('returns the first successful result without extra attempts', async () => {
    const { operation, calls } = failingTimes(0);
    await expect(retryAsync(operation, 3, 1)).resolves.toBe('ok');
    expect(calls()).toBe(1);
  });

  it('retries through transient failures', async () => {
    const { operation, calls } = failingTimes(2);
    await expect(retryAsync(operation, 3, 1)).resolves.toBe('ok');
    expect(calls()).toBe(3);
  });

  it('rethrows the last error unchanged once attempts are exhausted', async () => {
    const { operation, calls } = failingTimes(5);
    await expect(retryAsync(operation, 3, 1)).rejects.toThrow('failure 3');
    expect(calls()).toBe(3);
  });
});
