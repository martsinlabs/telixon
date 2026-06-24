import { REGION_CODES } from '@telixon/core';
import { Oracle } from '../oracle';
import { CorpusCase, CorpusCaseKind } from './corpus';
import { COMPARED_METHODS, ConformanceReport, KindBreakdown, MethodName, MethodReport, Mismatch } from './models';
import { evaluateWithTelixon } from './subject';

// Both sides return string | boolean | null; render to one comparable string.
function render(value: string | boolean | null): string {
  return value === null ? 'null' : String(value);
}

// The expectation recorded when Google refuses to parse an input Telixon judged possible.
export const GOOGLE_REJECTS_AT_PARSE = 'false (Google rejects at parse)';

// Diffs Telixon against the oracle across the corpus: parseable cases compared method by method; Google-rejected mutation cases must read as not possible and aggregate into the rejection report.
export function buildConformanceReport(oracle: Oracle, corpus: readonly CorpusCase[]): ConformanceReport {
  const mismatchesByMethod = new Map<MethodName, Mismatch[]>(COMPARED_METHODS.map((method) => [method, []]));
  const casesByKind = new Map<CorpusCaseKind, number>();
  const rejectionMismatches: Mismatch[] = [];
  const regions = new Set<string>();
  let compared = 0;
  let skipped = 0;
  let rejected = 0;
  let rejectionAgreed = 0;

  for (const corpusCase of corpus) {
    const { family, kind, input, defaultRegion, regionCode } = corpusCase;
    casesByKind.set(kind, (casesByKind.get(kind) ?? 0) + 1);

    const expected = oracle.evaluate(input, defaultRegion);
    if (!expected) {
      if (family !== 'mutation') {
        skipped += 1;
        continue;
      }
      rejected += 1;
      const actual = evaluateWithTelixon(input, defaultRegion);
      if (!actual.isPossible) {
        rejectionAgreed += 1;
      } else {
        rejectionMismatches.push({
          method: 'isPossible',
          kind,
          regionCode,
          input,
          expected: GOOGLE_REJECTS_AT_PARSE,
          actual: render(actual.isPossible),
        });
      }
      continue;
    }

    if (kind === 'example') regions.add(regionCode);
    compared += 1;
    const actual = evaluateWithTelixon(input, defaultRegion);

    for (const method of COMPARED_METHODS) {
      const expectedValue = render(expected[method]);
      const actualValue = render(actual[method]);
      if (expectedValue !== actualValue) {
        mismatchesByMethod.get(method)!.push({
          method,
          kind,
          regionCode,
          input,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    }
  }

  // Every compared case exercises every method, so each method's total is `compared`.
  const methods: MethodReport[] = COMPARED_METHODS.map((method) => {
    const mismatches = mismatchesByMethod.get(method)!;
    const matched = compared - mismatches.length;
    return { method, total: compared, matched, matchRate: compared === 0 ? 1 : matched / compared, mismatches };
  });

  const composition: KindBreakdown[] = [...casesByKind.entries()].map(([kind, cases]) => ({ kind, cases }));

  return {
    corpusSize: corpus.length,
    compared,
    skipped,
    regionsCovered: regions.size,
    regionsTotal: REGION_CODES.length,
    commit: oracle.commit,
    composition,
    methods,
    rejection: { total: rejected, agreed: rejectionAgreed, mismatches: rejectionMismatches },
  };
}
