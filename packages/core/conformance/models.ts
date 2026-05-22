import { NumberType } from '@telixon/core';

// Behaviors compared against the oracle: PhoneNumber query methods plus the controller's as-you-type output.
export const COMPARED_METHODS = [
  'isValid',
  'isPossible',
  'isPossibleWithReason',
  'getNumberType',
  'getNationalNumber',
  'getCallingCode',
  'getE164',
  'formatInternational',
  'getURI',
  'formatAsYouType',
] as const;

export type MethodName = (typeof COMPARED_METHODS)[number];

// One sampled number: a Google example for a region and type, in E.164 form.
export interface CorpusEntry {
  readonly regionCode: string;
  readonly sampledType: NumberType;
  readonly e164: string;
}

// Per-number outcome for every compared method, from either side.
export interface MethodResults {
  readonly isValid: boolean;
  readonly isPossible: boolean;
  readonly isPossibleWithReason: string;
  readonly getNumberType: NumberType | null;
  readonly getNationalNumber: string;
  readonly getCallingCode: string | null;
  readonly getE164: string | null;
  readonly formatInternational: string | null;
  readonly getURI: string | null;
  readonly formatAsYouType: string | null;
}

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
