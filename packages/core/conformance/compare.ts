import { REGION_IDS } from '@telixon/core';
import { COMPARED_METHODS, ConformanceReport, CorpusEntry, MethodName, MethodReport, Mismatch } from './models';
import { Oracle } from './oracle';
import { evaluateWithTelixon } from './subject';

// Both sides return string | boolean | null; render to one comparable string.
function render(value: string | boolean | null): string {
  return value === null ? 'null' : String(value);
}

// Diffs Telixon against the oracle across the corpus and aggregates per-method match rates.
export function buildConformanceReport(oracle: Oracle, corpus: readonly CorpusEntry[]): ConformanceReport {
  const mismatchesByMethod = new Map<MethodName, Mismatch[]>(COMPARED_METHODS.map((method) => [method, []]));
  const regions = new Set<string>();
  let compared = 0;
  let skipped = 0;

  for (const entry of corpus) {
    const expected = oracle.evaluate(entry.e164);
    if (!expected) {
      skipped += 1;
      continue;
    }
    regions.add(entry.regionCode);
    compared += 1;
    const actual = evaluateWithTelixon(entry.e164);

    for (const method of COMPARED_METHODS) {
      const expectedValue = render(expected[method]);
      const actualValue = render(actual[method]);
      if (expectedValue !== actualValue) {
        mismatchesByMethod.get(method)!.push({
          method,
          regionCode: entry.regionCode,
          e164: entry.e164,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    }
  }

  // Every compared number exercises every method, so each method's total is `compared`.
  const methods: MethodReport[] = COMPARED_METHODS.map((method) => {
    const mismatches = mismatchesByMethod.get(method)!;
    const matched = compared - mismatches.length;
    return { method, total: compared, matched, matchRate: compared === 0 ? 1 : matched / compared, mismatches };
  });

  return {
    corpusSize: corpus.length,
    skipped,
    regionsCovered: regions.size,
    regionsTotal: REGION_IDS.length,
    commit: oracle.commit,
    methods,
  };
}
