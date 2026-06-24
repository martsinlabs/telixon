import { afterAll, bench, describe } from 'vitest';
import { clearGlobalCaches } from '../src/modules/number-resolver/__internal__/clear-global-caches';
import { ADAPTERS, type PhoneLibraryAdapter, telixonReady } from './competitors';
import { consume, flushSink } from './consume';
import { CORPUS } from './corpus';

await telixonReady;

afterAll(flushSink);

const QUERY_METHODS = [
  'isValid',
  'isPossible',
  'isPossibleWithReason',
  'getNumberType',
  'getNationalNumber',
  'getCallingCode',
  'getRegion',
  'formatE164',
  'formatRfc3966',
  'formatNational',
  'formatInternational',
] as const;
type QueryMethod = (typeof QUERY_METHODS)[number];

function call(adapter: PhoneLibraryAdapter, method: QueryMethod, parsed: unknown): void {
  consume((adapter[method] as (value: unknown) => unknown)(parsed));
}

function clearTelixonGlobalCachesIfTelixon(adapter: PhoneLibraryAdapter): void {
  if (adapter.name === 'telixon') clearGlobalCaches();
}

// ── Parse ────────────────────────────────────────────────

describe('parsePhoneNumber (corpus pass)', () => {
  for (const adapter of ADAPTERS) {
    bench(adapter.name, () => {
      for (const entry of CORPUS) consume(adapter.parse(entry.e164, entry.region));
    });
  }
});

// ── Strict cold ──────────────────────────────────────────

for (const method of QUERY_METHODS) {
  describe(`parse + ${method} (strict cold)`, () => {
    for (const adapter of ADAPTERS) {
      bench(adapter.name, () => {
        clearTelixonGlobalCachesIfTelixon(adapter);
        for (const entry of CORPUS) {
          const parsed = adapter.parse(entry.e164, entry.region);
          call(adapter, method, parsed);
        }
      });
    }
  });
}

// ── Cold ─────────────────────────────────────────────────

for (const method of QUERY_METHODS) {
  describe(`parse + ${method} (cold)`, () => {
    for (const adapter of ADAPTERS) {
      bench(adapter.name, () => {
        for (const entry of CORPUS) {
          const parsed = adapter.parse(entry.e164, entry.region);
          call(adapter, method, parsed);
        }
      });
    }
  });
}

// ── Warm ─────────────────────────────────────────────────

const parsedByAdapter = new Map<string, readonly unknown[]>();
for (const adapter of ADAPTERS) {
  parsedByAdapter.set(
    adapter.name,
    CORPUS.map((entry) => adapter.parse(entry.e164, entry.region)),
  );
}

for (const method of QUERY_METHODS) {
  describe(`${method} (warm, pre-parsed)`, () => {
    for (const adapter of ADAPTERS) {
      const parsedEntries = parsedByAdapter.get(adapter.name)!;
      bench(adapter.name, () => {
        for (const parsed of parsedEntries) call(adapter, method, parsed);
      });
    }
  });
}
