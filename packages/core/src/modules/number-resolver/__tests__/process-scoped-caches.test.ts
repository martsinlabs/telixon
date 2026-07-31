import { parsePhoneNumber } from '@telixon/core';
import { describe, expect, it, vi } from 'vitest';
import { version } from '../../../../package.json';

type CacheSlot = { readonly size?: number; readonly length?: number };

const slot = (name: string): CacheSlot | undefined =>
  (globalThis as unknown as Record<symbol, CacheSlot | undefined>)[
    Symbol.for(`telixon.core.memoCache.${version}.${name}`)
  ];

const entryCount = (name: string): number => slot(name)?.size ?? slot(name)?.length ?? 0;

// The strict-cold bench scenario relies on this invariant: the harness imports clearGlobalCaches
// from src while measuring the built entry, which only works while the memo caches stay
// process-scoped. A cache reverted to a plain module-level Map fails this test.
describe('process-scoped memo caches', () => {
  it('lets a fresh module copy of clearGlobalCaches empty the caches the first copy populated', async () => {
    parsePhoneNumber('(415) 555-0132', { defaultRegion: 'US' }).formatNational();

    expect(entryCount('iddMatchers')).toBeGreaterThan(0);
    expect(entryCount('exactFormatMasks')).toBeGreaterThan(0);

    vi.resetModules();
    const { clearGlobalCaches } = await import('../__internal__/clear-global-caches');
    clearGlobalCaches();

    expect(entryCount('iddMatchers')).toBe(0);
    expect(entryCount('exactFormatMasks')).toBe(0);
    expect(entryCount('longestFormatMasks')).toBe(0);
    expect(entryCount('nationalPrefixRules')).toBe(0);
  });
});
