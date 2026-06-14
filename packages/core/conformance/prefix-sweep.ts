import { CorpusEntry, Oracle } from '../oracle';
import { GOOGLE_REJECTS_AT_PARSE } from './compare';
import { Mismatch } from './models';
import { evaluateWithTelixon } from './subject';

// '+' plus one digit: the shortest prefix worth parsing.
const MIN_PREFIX_LENGTH = 2;

export interface PrefixSweepReport {
  readonly totalPrefixes: number;
  // Prefixes Google parses: the possibility reason is compared verbatim.
  readonly compared: number;
  readonly matched: number;
  // Prefixes Google rejects at parse: Telixon must judge them not possible.
  readonly rejectedByGoogle: number;
  readonly rejectionAgreed: number;
  readonly mismatches: readonly Mismatch[];
}

// Every digit prefix of every example, parsed by both sides: the possibility verdict must track Google's at each step (the per-keystroke surface, checked over the standalone parser).
export function sweepPossibilityPrefixes(oracle: Oracle, examples: readonly CorpusEntry[]): PrefixSweepReport {
  const seenPrefixes = new Set<string>();
  const mismatches: Mismatch[] = [];
  let totalPrefixes = 0;
  let compared = 0;
  let matched = 0;
  let rejectedByGoogle = 0;
  let rejectionAgreed = 0;

  for (const example of examples) {
    for (let length = MIN_PREFIX_LENGTH; length <= example.e164.length; length += 1) {
      const prefix = example.e164.slice(0, length);
      if (seenPrefixes.has(prefix)) continue;
      seenPrefixes.add(prefix);
      totalPrefixes += 1;

      const expected = oracle.evaluate(prefix);
      const actual = evaluateWithTelixon(prefix);

      if (!expected) {
        rejectedByGoogle += 1;
        if (!actual.isPossible) {
          rejectionAgreed += 1;
        } else {
          mismatches.push({
            method: 'isPossible',
            kind: 'possibility-prefix',
            regionCode: example.regionCode,
            input: prefix,
            expected: GOOGLE_REJECTS_AT_PARSE,
            actual: String(actual.isPossible),
          });
        }
        continue;
      }

      compared += 1;
      if (expected.isPossibleWithReason === actual.isPossibleWithReason) {
        matched += 1;
      } else {
        mismatches.push({
          method: 'isPossibleWithReason',
          kind: 'possibility-prefix',
          regionCode: example.regionCode,
          input: prefix,
          expected: expected.isPossibleWithReason,
          actual: actual.isPossibleWithReason,
        });
      }
    }
  }

  return { totalPrefixes, compared, matched, rejectedByGoogle, rejectionAgreed, mismatches };
}
