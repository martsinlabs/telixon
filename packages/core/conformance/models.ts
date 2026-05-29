// PhoneNumber query behaviors compared per number against the oracle. As-you-type formatting is a
// per-keystroke axis (see as-you-type.ts), not a per-number method.
export const COMPARED_METHODS = [
  'isValid',
  'isPossible',
  'isPossibleWithReason',
  'getNumberType',
  'getNationalNumber',
  'getCallingCode',
  'getCountry',
  'getE164',
  'formatNational',
  'formatInternational',
  'getURI',
] as const;

export type MethodName = (typeof COMPARED_METHODS)[number];

export interface Mismatch {
  readonly method: MethodName;
  readonly regionCode: string;
  readonly e164: string;
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

export interface ConformanceReport {
  readonly corpusSize: number;
  readonly skipped: number;
  readonly regionsCovered: number;
  readonly regionsTotal: number;
  // The google/libphonenumber commit shared by the engine and the oracle.
  readonly commit: string;
  readonly methods: readonly MethodReport[];
}
