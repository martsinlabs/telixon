import { getResourceProvider } from '@telixon/core/resource-provider';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadOracle } from '../oracle';
import { createAirtightEnumerator } from './airtight-enumerator';
import { createDivergenceCollector } from './differential';
import { geographicDomain } from './enumeration-domain';
import { createNumberEnumerator, EnumeratedNumber } from './number-enumerator';

// Differential fuzzer: checks every method against Google's libphonenumber at the pinned commit. Two
// enumerations - distinct (default, broad sample) and airtight (FUZZ_AIRTIGHT=1, exhaustive). Both are
// pure index->number maps, so a run is one slice; FUZZ_SHARD_COUNT/INDEX or FUZZ_START/FUZZ_N pick it.

const oracle = await loadOracle();
const { regions, callingCodes } = geographicDomain(oracle);

const MIN_LENGTH = Number(process.env.FUZZ_MINLEN ?? 5);
const MAX_LENGTH = Number(process.env.FUZZ_MAXLEN ?? 14);

const enumerator = createNumberEnumerator({ callingCodes, regions, minLength: MIN_LENGTH, maxLength: MAX_LENGTH });
const airtight =
  process.env.FUZZ_AIRTIGHT === '1'
    ? createAirtightEnumerator(getResourceProvider().engine, callingCodes, MIN_LENGTH, MAX_LENGTH)
    : null;

const limit: number = airtight ? airtight.total : enumerator.distinctLimit;
const numberAt = (index: number): EnumeratedNumber =>
  airtight ? { input: airtight.at(index), region: undefined } : enumerator.at(index);

// The slice [start, start + count) this run covers: a shard of the whole space (FUZZ_SHARD_*), or an
// explicit FUZZ_START/FUZZ_N (default: a 1M sample, or the entire airtight space).
function resolveSlice(): { start: number; count: number } {
  const shardCount = Number(process.env.FUZZ_SHARD_COUNT ?? 1);
  if (shardCount > 1) {
    const shardIndex = Number(process.env.FUZZ_SHARD_INDEX ?? 0);
    const shardSize = Math.ceil(limit / shardCount);
    // Equal disjoint slices covering [0, limit); rounding up can push late shards past the end, so clamp.
    const start = Math.min(shardIndex * shardSize, limit);
    return { start, count: Math.min(shardSize, limit - start) };
  }
  const start = Number(process.env.FUZZ_START ?? 0);
  const fallback = airtight ? limit - start : Math.min(1_000_000, limit - start);
  return { start, count: Number(process.env.FUZZ_N ?? fallback) };
}

const { start, count } = resolveSlice();

describe('Differential fuzzer vs Google libphonenumber', () => {
  it('produces zero divergences across the enumerated inputs', () => {
    if (start + count > limit) {
      throw new RangeError(
        `slice [${start}, ${start + count}) exceeds the available ${limit.toLocaleString()} inputs; lower FUZZ_N/FUZZ_START or raise FUZZ_MINLEN`,
      );
    }

    const collector = createDivergenceCollector(oracle);
    for (let offset = 0; offset < count; offset++) {
      const number = numberAt(start + offset);
      collector.add(number.input, number.region);
    }

    const patterns = collector.patterns();
    const distDir = join(dirname(fileURLToPath(import.meta.url)), 'dist');
    mkdirSync(distDir, { recursive: true });
    writeFileSync(
      join(distDir, process.env.FUZZ_OUT ?? 'fuzz.json'),
      JSON.stringify({ commit: oracle.commit, fuzzed: count, start, divergences: collector.total, patterns }, null, 2),
    );

    const enumeration = airtight
      ? `airtight, total ${airtight.total.toLocaleString()}`
      : `${enumerator.trackCount} tracks`;
    console.log(
      `\nFuzzed ${count.toLocaleString()} inputs [${start.toLocaleString()}..${(start + count).toLocaleString()}) vs Google libphonenumber @ ${oracle.commit} (${enumeration}, lengths ${MIN_LENGTH}-${MAX_LENGTH})`,
    );
    console.log(`Skipped (non-geographic 001, out of scope): ${collector.skipped.toLocaleString()}`);
    console.log(`Divergences: ${collector.total} across ${patterns.length} distinct patterns\n`);
    for (const pattern of patterns.slice(0, 50)) {
      const where = pattern.exampleRegion ? ` region=${pattern.exampleRegion}` : '';
      console.log(
        `  [${pattern.method}] ${pattern.expected} -> ${pattern.actual}  (x${pattern.count})  e.g. "${pattern.exampleInput}"${where}`,
      );
    }

    expect(collector.total).toBe(0);
  }, 21_600_000);
});
