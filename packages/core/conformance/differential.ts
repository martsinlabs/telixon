import { RegionId } from '@telixon/core';
import { MethodResults, Oracle } from '../oracle';
import { GOOGLE_REJECTS_AT_PARSE } from './compare';
import { COMPARED_METHODS, MethodName } from './models';
import { evaluateWithTelixon } from './subject';

// Shared one-input comparison against Google, used by the fuzz sweep and the case-coverage gate:
// out-of-scope check, single-input compare, and folding many comparisons into a few patterns.

// Non-geographic codes (region 001: +800, +870, +888, ...) are out of scope - the parity claim is geographic.
const NON_GEO_CODES: readonly string[] = ['800', '808', '870', '878', '881', '882', '883', '888', '979', '991'];

export function isNonGeographic(input: string, expected: MethodResults | null): boolean {
  if (expected && expected.getCountry === '001') return true;
  if (input.startsWith('+')) {
    const digits = input.slice(1);
    return NON_GEO_CODES.some((code) => digits.startsWith(code));
  }
  return false;
}

// One method-level disagreement between Telixon and the oracle for a single input.
export interface Divergence {
  readonly method: string;
  readonly expected: string;
  readonly actual: string;
}

// Both sides return string | boolean | null; render to one comparable string.
function render(value: string | boolean | null): string {
  return value === null ? 'null' : String(value);
}

// Compare one input across all methods: null if out of scope, [] if it fully agrees, else one entry per diff.
export function compareAgainstOracle(
  oracle: Oracle,
  input: string,
  country: RegionId | undefined,
): Divergence[] | null {
  const expected = oracle.evaluate(input, country);
  if (isNonGeographic(input, expected)) return null;

  let actual: MethodResults;
  try {
    actual = evaluateWithTelixon(input, country);
  } catch (error) {
    return [
      { method: 'threw', expected: '(no throw)', actual: error instanceof Error ? error.message : String(error) },
    ];
  }

  // Google refused to parse: Telixon agrees only by judging the same input not possible.
  if (!expected) {
    return actual.isPossible
      ? [{ method: 'isPossible', expected: GOOGLE_REJECTS_AT_PARSE, actual: render(actual.isPossible) }]
      : [];
  }

  const divergences: Divergence[] = [];
  for (const method of COMPARED_METHODS as readonly MethodName[]) {
    const expectedValue = render(expected[method]);
    const actualValue = render(actual[method]);
    if (expectedValue !== actualValue) divergences.push({ method, expected: expectedValue, actual: actualValue });
  }
  return divergences;
}

// A disagreement class deduplicated across inputs: how many inputs hit it, plus a reproducing example.
export interface DivergencePattern extends Divergence {
  readonly exampleInput: string;
  readonly exampleCountry: RegionId | null;
  count: number;
}

export interface DivergenceCollector {
  readonly total: number;
  readonly skipped: number;
  add(input: string, country: RegionId | undefined): void;
  // Distinct patterns, most frequent first.
  patterns(): DivergencePattern[];
}

// Folds comparisons into patterns keyed by (method, expected, actual), so millions of inputs summarize to
// a few disagreement classes.
export function createDivergenceCollector(oracle: Oracle): DivergenceCollector {
  const patterns = new Map<string, DivergencePattern>();
  let total = 0;
  let skipped = 0;

  return {
    get total() {
      return total;
    },
    get skipped() {
      return skipped;
    },
    add(input, country) {
      const divergences = compareAgainstOracle(oracle, input, country);
      if (divergences === null) {
        skipped += 1;
        return;
      }
      for (const divergence of divergences) {
        total += 1;
        const key = `${divergence.method}|${divergence.expected}|${divergence.actual}`;
        const existing = patterns.get(key);
        if (existing) {
          existing.count += 1;
          continue;
        }
        patterns.set(key, { ...divergence, exampleInput: input, exampleCountry: country ?? null, count: 1 });
      }
    },
    patterns() {
      return [...patterns.values()].sort((a, b) => b.count - a.count);
    },
  };
}
