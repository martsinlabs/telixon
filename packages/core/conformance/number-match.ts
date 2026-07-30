import { matchPhoneNumbers } from '@telixon/core';
import { CorpusEntry, Oracle } from '../oracle';

export interface NumberMatchSweep {
  readonly compared: number;
  readonly mismatches: readonly string[];
}

// Grades deterministic pairs over every Google example against the oracle's isNumberMatch:
// identity across notations, national against international, suffixes, extension presence and
// conflict, cross-example pairs, and length-bounds junk.
export function sweepNumberMatch(oracle: Oracle, examples: readonly CorpusEntry[]): NumberMatchSweep {
  let compared = 0;
  const mismatches: string[] = [];

  const check = (first: string, second: string): void => {
    const expected: string = oracle.matchNumbers(first, second);
    const actual: string = matchPhoneNumbers(first, second);
    compared += 1;
    if (actual !== expected && mismatches.length < 25) {
      mismatches.push(`${JSON.stringify(first)} vs ${JSON.stringify(second)} telixon=${actual} google=${expected}`);
    }
  };

  let previousE164: string | null = null;
  for (const example of examples) {
    const rendered = oracle.evaluate(example.e164);
    if (!rendered?.formatInternational || !rendered.formatNational) continue;
    const { e164 } = example;

    check(e164, rendered.formatInternational);
    check(rendered.formatNational, e164);
    check(e164, `${e164} ext. 22`);
    check(`${e164} ext. 22`, `${rendered.formatInternational} x22`);
    check(`${e164} ext. 22`, `${e164} ext. 23`);
    check(rendered.formatNational, rendered.formatInternational);
    const nationalNumber: string = rendered.getNationalNumber;
    if (nationalNumber.length > 4) check(nationalNumber.slice(-4), e164);
    if (previousE164 !== null) check(e164, previousE164);
    previousE164 = e164;
  }

  return { compared, mismatches };
}
