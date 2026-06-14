import { CorpusCase, RenderedExample } from './models';

// Digits dropped from the end of the example; one case per depth, exercising TOO_SHORT boundaries.
const TRUNCATION_DEPTHS = [1, 2, 3] as const;

// Digits appended to the example; one case per suffix, exercising TOO_LONG boundaries.
const EXTENSION_SUFFIXES = ['0', '00'] as const;

// '+' plus two digits: the shortest input a truncation is allowed to produce.
const MIN_TRUNCATED_LENGTH = 3;

// Calling codes Google leaves unassigned; both sides must judge each input not possible.
const UNASSIGNED_CALLING_CODE_INPUTS = ['+0', '+0123456789', '+999', '+999123456789'] as const;

const ZERO_CHAR_CODE = 48;

// Replaces the first national digit with its successor mod 10, shifting the leading-digit class while keeping length; null when the E.164 has no national digits.
function mutateFirstNationalDigit(e164: string, callingCode: string | null): string | null {
  if (!callingCode) return null;
  const callingCodePrefix = `+${callingCode}`;
  if (!e164.startsWith(callingCodePrefix) || e164.length === callingCodePrefix.length) return null;
  const firstNationalDigit = e164.charCodeAt(callingCodePrefix.length) - ZERO_CHAR_CODE;
  const replacement = String.fromCharCode(((firstNationalDigit + 1) % 10) + ZERO_CHAR_CODE);
  return callingCodePrefix + replacement + e164.slice(callingCodePrefix.length + 1);
}

// Deterministic corruptions of every example (truncations, extensions, a leading-digit shift, unassigned calling codes); differential, so a still-valid mutation is a case both sides must agree on.
export function deriveMutations(renderedExamples: readonly RenderedExample[]): CorpusCase[] {
  const mutations: CorpusCase[] = [];

  for (const { example, rendered } of renderedExamples) {
    const { regionCode, e164 } = example;

    for (const depth of TRUNCATION_DEPTHS) {
      const truncated = e164.slice(0, e164.length - depth);
      if (truncated.length < MIN_TRUNCATED_LENGTH) continue;
      mutations.push({ family: 'mutation', kind: 'truncated', input: truncated, regionCode, sourceE164: e164 });
    }

    for (const suffix of EXTENSION_SUFFIXES) {
      mutations.push({ family: 'mutation', kind: 'extended', input: e164 + suffix, regionCode, sourceE164: e164 });
    }

    const leadingDigitMutated = mutateFirstNationalDigit(e164, rendered.getCallingCode);
    if (leadingDigitMutated) {
      mutations.push({
        family: 'mutation',
        kind: 'first-national-digit-mutated',
        input: leadingDigitMutated,
        regionCode,
        sourceE164: e164,
      });
    }
  }

  for (const input of UNASSIGNED_CALLING_CODE_INPUTS) {
    mutations.push({ family: 'mutation', kind: 'unassigned-calling-code', input, regionCode: 'ZZ', sourceE164: null });
  }

  return mutations;
}
