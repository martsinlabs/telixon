import { version } from '../../package.json';

// Process-wide memo storage, mirroring the resource-provider singleton: duplicate copies of a
// caching module (multiple bundles in one process, the bench harness beside the built entry) share
// one cache instance through globalThis (Symbol.for), and the module-local binding each copy takes
// at load keeps every cache hit a plain read. The key carries the package version, so copies of
// different library versions in one process keep separate caches (key encodings may differ).
export function getProcessScopedCache<T>(slot: string, create: () => T): T {
  const key = Symbol.for(`telixon.core.memoCache.${version}.${slot}`);
  const store = globalThis as unknown as Record<symbol, T | undefined>;
  const existing: T | undefined = store[key];
  if (existing !== undefined) return existing;
  const created: T = create();
  store[key] = created;
  return created;
}
