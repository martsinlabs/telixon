import type { MethodResults } from '../oracle/types';
import { CorpusCaseKind } from './corpus';

// PhoneNumber query behaviors compared per number against the oracle (as-you-type is a per-keystroke axis, see as-you-type.ts, not a per-number method).
// `satisfies` rejects any entry that is not a real comparison key; the completeness guard below rejects any key left out.
export const COMPARED_METHODS = [
  'isValid',
  'isPossible',
  'isPossibleWithReason',
  'getNumberType',
  'getNationalNumber',
  'getCallingCode',
  'getRegion',
  'formatE164',
  'formatNational',
  'formatInternational',
  'formatRfc3966',
] as const satisfies readonly (keyof MethodResults)[];

export type MethodName = (typeof COMPARED_METHODS)[number];

// Compile-time: every MethodResults key must be listed above, so a method silently dropped from the comparison fails typecheck.
const _allMethodsCompared: Exclude<keyof MethodResults, MethodName> extends never ? true : never = true;

// Methods gated against the oracle: the per-number MethodResults surface plus the region-parameterized
// isValidForRegion, which is compared as its own axis (see valid-for-region.ts).
export type AuditedMethod = MethodName | 'isValidForRegion';

// Where a mismatch came from: a corpus case kind, the per-prefix possibility sweep, or a valid-for-region sweep.
export type MismatchKind = CorpusCaseKind | 'possibility-prefix' | 'valid-for-region' | 'valid-for-region-case';

export interface Mismatch {
  readonly method: AuditedMethod;
  readonly kind: MismatchKind;
  readonly regionCode: string;
  // The exact input string both sides parsed.
  readonly input: string;
  readonly expected: string;
  readonly actual: string;
}

export interface MethodReport {
  readonly method: MethodName;
  readonly total: number;
  readonly matched: number;
  readonly matchRate: number;
  readonly mismatches: readonly Mismatch[];
}

// Cases per corpus kind, preserving the corpus build order.
export interface KindBreakdown {
  readonly kind: CorpusCaseKind;
  readonly cases: number;
}

// Mutation-family cases Google rejects at parse; Telixon never throws, so agreement means it judges the same input not possible.
export interface RejectionReport {
  readonly total: number;
  readonly agreed: number;
  readonly mismatches: readonly Mismatch[];
}

export interface ConformanceReport {
  readonly corpusSize: number;
  // Cases with verdicts on both sides (every compared method ran on each of these).
  readonly compared: number;
  // Example or display-variant cases Google could not parse: must stay zero.
  readonly skipped: number;
  readonly regionsCovered: number;
  readonly regionsTotal: number;
  // The google/libphonenumber commit shared by the engine and the oracle.
  readonly commit: string;
  readonly composition: readonly KindBreakdown[];
  readonly methods: readonly MethodReport[];
  readonly rejection: RejectionReport;
}
