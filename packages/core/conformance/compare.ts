import { COUNTRY_IDS } from '@telixon/core';
import provenance from '../src/engine/PROVENANCE.json';
import {
  COMPARED_METHODS,
  ConformanceReport,
  CorpusEntry,
  MethodName,
  MethodReport,
  MethodResults,
  Mismatch,
} from './models';
import { evaluateWithOracle, getOracleVersion } from './oracle';
import { evaluateWithTelixon } from './subject';

interface MethodTally {
  total: number;
  matched: number;
  readonly mismatches: Mismatch[];
}

function emptyTally(): Record<MethodName, MethodTally> {
  return {
    isValid: { total: 0, matched: 0, mismatches: [] },
    isPossible: { total: 0, matched: 0, mismatches: [] },
    isPossibleWithReason: { total: 0, matched: 0, mismatches: [] },
    getNumberType: { total: 0, matched: 0, mismatches: [] },
    getNationalNumber: { total: 0, matched: 0, mismatches: [] },
    getCallingCode: { total: 0, matched: 0, mismatches: [] },
    getE164: { total: 0, matched: 0, mismatches: [] },
  };
}

function stringifyValue(value: string | boolean | null): string {
  return value === null ? 'null' : String(value);
}

// Diffs Telixon against the oracle across the corpus and aggregates per-method match rates.
export function buildConformanceReport(corpus: readonly CorpusEntry[]): ConformanceReport {
  const tally = emptyTally();
  const regions = new Set<string>();
  let skipped = 0;

  for (const entry of corpus) {
    const expected: MethodResults | null = evaluateWithOracle(entry.e164);
    if (!expected) {
      skipped += 1;
      continue;
    }
    regions.add(entry.regionCode);
    const actual: MethodResults = evaluateWithTelixon(entry.e164);

    for (const method of COMPARED_METHODS) {
      const expectedValue: string = stringifyValue(expected[method]);
      const actualValue: string = stringifyValue(actual[method]);
      const bucket: MethodTally = tally[method];
      bucket.total += 1;

      if (expectedValue === actualValue) {
        bucket.matched += 1;
      } else {
        bucket.mismatches.push({
          method,
          regionCode: entry.regionCode,
          e164: entry.e164,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    }
  }

  const methods: MethodReport[] = COMPARED_METHODS.map((method) => {
    const { total, matched, mismatches } = tally[method];
    return { method, total, matched, matchRate: total === 0 ? 1 : matched / total, mismatches };
  });

  return {
    corpusSize: corpus.length,
    skipped,
    regionsCovered: regions.size,
    regionsTotal: COUNTRY_IDS.length,
    engineCommit: provenance.source.commit,
    oracleVersion: getOracleVersion(),
    methods,
  };
}
